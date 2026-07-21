import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('id, sku, size, color, price, stock_quantity, reserved_quantity, product:products(id, name)')
    .order('stock_quantity', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ variants: data });
});

router.get('/:variantId/history', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('inventory_adjustments')
    .select('*')
    .eq('variant_id', req.params.variantId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ adjustments: data });
});

router.post('/adjust', requireAuth, async (req, res) => {
  const { variant_id, change_quantity, reason, note } = req.body;

  if (!variant_id || !change_quantity || !reason) {
    return res.status(400).json({ error: 'variant_id, change_quantity, and reason are required' });
  }

  const { data: variant, error: fetchError } = await supabaseAdmin
    .from('product_variants')
    .select('stock_quantity')
    .eq('id', variant_id)
    .single();

  if (fetchError) return res.status(404).json({ error: fetchError.message });

  const newQuantity = Math.max(0, variant.stock_quantity + Number(change_quantity));

  const { error: updateError } = await supabaseAdmin
    .from('product_variants')
    .update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', variant_id);

  if (updateError) return res.status(400).json({ error: updateError.message });

  const { error: logError } = await supabaseAdmin.from('inventory_adjustments').insert({
    variant_id,
    change_quantity: Number(change_quantity),
    reason,
    note: note || null,
    created_by: req.user.id,
  });

  if (logError) return res.status(400).json({ error: logError.message });

  res.json({ stock_quantity: newQuantity });
});

export default router;
