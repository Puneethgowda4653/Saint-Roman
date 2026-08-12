import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('testimonials').select('*').order('sort_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ testimonials: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('testimonials').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ testimonial: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ testimonial: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('testimonials').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
