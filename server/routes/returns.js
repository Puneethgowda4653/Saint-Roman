import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

const STATUSES = ['requested', 'approved', 'rejected', 'picked_up', 'inspecting', 'refunded', 'exchanged'];

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('returns')
    .select('*, order:orders(order_number, customer_name), order_item:order_items(product_name, variant_label, unit_price)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ returns: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { order_id, order_item_id, quantity, reason, notes } = req.body;

  if (!order_id || !order_item_id || !quantity) {
    return res.status(400).json({ error: 'order_id, order_item_id, and quantity are required' });
  }

  const { data: item, error: itemError } = await supabaseAdmin
    .from('order_items')
    .select('unit_price')
    .eq('id', order_item_id)
    .single();

  if (itemError) return res.status(404).json({ error: itemError.message });

  const { data, error } = await supabaseAdmin
    .from('returns')
    .insert({
      order_id,
      order_item_id,
      quantity,
      reason: reason || null,
      notes: notes || null,
      refund_amount: item.unit_price * quantity,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ return: data });
});

// Marking a return "refunded" restocks the variant and logs it in inventory_adjustments,
// so the Order -> Return -> Refund -> Restock loop is real, not just a status label.
router.put('/:id', requireAuth, async (req, res) => {
  const { status, notes } = req.body;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('returns')
    .select('*, order_item:order_items(variant_id)')
    .eq('id', req.params.id)
    .single();

  if (fetchError) return res.status(404).json({ error: fetchError.message });

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabaseAdmin
    .from('returns')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (status === 'refunded' && existing.status !== 'refunded' && existing.order_item?.variant_id) {
    const variantId = existing.order_item.variant_id;
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .single();

    if (variant) {
      await supabaseAdmin
        .from('product_variants')
        .update({ stock_quantity: variant.stock_quantity + existing.quantity })
        .eq('id', variantId);

      await supabaseAdmin.from('inventory_adjustments').insert({
        variant_id: variantId,
        change_quantity: existing.quantity,
        reason: 'return',
        note: `Return ${req.params.id} refunded`,
        created_by: req.user.id,
      });
    }

    logAudit({
      actorEmail: req.user.email,
      action: 'refund',
      entityType: 'return',
      entityId: req.params.id,
      details: { refund_amount: existing.refund_amount, order_id: existing.order_id },
    });
  }

  res.json({ return: data });
});

export default router;
