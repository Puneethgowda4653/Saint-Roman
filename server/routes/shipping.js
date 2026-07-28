import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ---- Shipping rate rules (admin-defined) ----
router.get('/rates', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .select('*')
    .order('min_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rates: data });
});

router.post('/rates', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .insert(req.body)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ rate: data });
});

router.put('/rates/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ rate: data });
});

router.delete('/rates/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('shipping_rates').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// ---- Shipments (derived from real orders) ----
// Every order that has reached a fulfilment-relevant stage. Courier + tracking are edited here
// and written straight back onto the order row.
const SHIPPABLE_STATUSES = ['processing', 'packed', 'ready_to_ship', 'shipped', 'delivered'];

router.get('/shipments', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, status, courier, tracking_number, total, created_at')
    .in('status', SHIPPABLE_STATUSES)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ shipments: data });
});

router.put('/shipments/:id', requireAuth, async (req, res) => {
  const { courier, tracking_number } = req.body;
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ courier: courier ?? null, tracking_number: tracking_number ?? null })
    .eq('id', req.params.id)
    .select('id, order_number, customer_name, status, courier, tracking_number, total, created_at')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ shipment: data });
});

export default router;
