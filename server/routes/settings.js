import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('settings').select('*').single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ settings: data });
});

router.put('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .update(req.body)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ settings: data });
});

export default router;
