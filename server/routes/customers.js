import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*, orders(id, total)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const customers = data.map(({ orders, ...customer }) => ({
    ...customer,
    order_count: orders.length,
    lifetime_value: orders.reduce((sum, o) => sum + Number(o.total), 0),
  }));

  res.json({ customers });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*, orders(*, order_items(*))')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json({ customer: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('customers').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ customer: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ customer: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('customers').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
