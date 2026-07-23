import { Router } from 'express';
import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

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

// Called by AuthContext right after a successful sign-in. The actual login happens client-side
// via the Supabase JS SDK directly (not through this server), so this is how a login event
// becomes visible to the admin-facing Audit Logs page.
router.post('/log-login', requireAuth, async (req, res) => {
  await logAudit({ actorEmail: req.user.email, action: 'login', entityType: 'auth', entityId: req.user.id });
  res.json({ success: true });
});

export default router;
