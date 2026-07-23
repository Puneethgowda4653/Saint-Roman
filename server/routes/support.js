import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tickets: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, priority } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (priority !== undefined) patch.priority = priority;

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ticket: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('support_tickets').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
