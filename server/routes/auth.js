import { Router } from 'express';
import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({ session: data.session, user: data.user });
});

router.post('/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.slice(7);
  await supabaseAdmin.auth.admin.signOut(token).catch(() => {});
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
