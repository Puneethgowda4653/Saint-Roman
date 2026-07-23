import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

const STATUSES = [
  'pending', 'processing', 'packed', 'ready_to_ship', 'shipped',
  'delivered', 'cancelled', 'returned', 'refund_initiated', 'refund_completed',
];

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ELL-${stamp}-${rand}`;
}

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json({ order: data });
});

// Creates an order and its line items, and decrements stock for each variant sold.
// No public checkout yet — this is for admin-entered (phone/manual) orders.
router.post('/', requireAuth, async (req, res) => {
  const { customer_id, customer_name, customer_email, customer_phone, shipping_address, shipping_fee, notes, items } = req.body;

  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customer_name and at least one item are required' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal + Number(shipping_fee || 0);

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customer_id || null,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      shipping_address: shipping_address || null,
      subtotal,
      shipping_fee: shipping_fee || 0,
      total,
      notes: notes || null,
    })
    .select()
    .single();

  if (orderError) return res.status(400).json({ error: orderError.message });

  const rows = items.map((item) => ({
    order_id: order.id,
    variant_id: item.variant_id || null,
    product_name: item.product_name,
    variant_label: item.variant_label || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(rows);
  if (itemsError) return res.status(400).json({ error: itemsError.message });

  // Best-effort stock decrement per line item — not wrapped in a DB transaction (no RPC yet),
  // so a mid-loop failure can leave stock partially decremented for this order.
  for (const item of items) {
    if (!item.variant_id) continue;
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', item.variant_id)
      .single();
    if (!variant) continue;
    await supabaseAdmin
      .from('product_variants')
      .update({ stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) })
      .eq('id', item.variant_id);
  }

  res.status(201).json({ order });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, tracking_number, courier, notes } = req.body;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (tracking_number !== undefined) patch.tracking_number = tracking_number;
  if (courier !== undefined) patch.courier = courier;
  if (notes !== undefined) patch.notes = notes;

  const { data: before } = await supabaseAdmin.from('orders').select('status, order_number').eq('id', req.params.id).single();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (status !== undefined && before && before.status !== status) {
    logAudit({
      actorEmail: req.user.email,
      action: 'status_change',
      entityType: 'order',
      entityId: req.params.id,
      details: { order_number: before.order_number, old_status: before.status, new_status: status },
    });
  }

  res.json({ order: data });
});

export default router;
