import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ coupons: data });
});

router.post('/', requireAuth, async (req, res) => {
  const body = { ...req.body, code: (req.body.code || '').toUpperCase().trim() };
  const { data, error } = await supabaseAdmin.from('coupons').insert(body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ coupon: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const body = { ...req.body, updated_at: new Date().toISOString() };
  if (body.code) body.code = body.code.toUpperCase().trim();
  const { data, error } = await supabaseAdmin.from('coupons').update(body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ coupon: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('coupons').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
