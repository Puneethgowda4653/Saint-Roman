import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const ROLES = ['admin', 'manager', 'warehouse', 'marketing', 'finance', 'support', 'vendor'];

// Team/role management is admin-only for all routes here — a manager shouldn't be able to grant
// themselves (or anyone) admin access.
router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res) => {
  const [{ data: profiles, error }, { data: usersData, error: usersError }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  if (error) return res.status(500).json({ error: error.message });
  if (usersError) return res.status(500).json({ error: usersError.message });

  const emailById = new Map(usersData.users.map((u) => [u.id, u.email]));
  const members = profiles.map((p) => ({ ...p, email: emailById.get(p.id) || null }));

  res.json({ members });
});

// Creates a new admin-panel user directly (no email invite flow — no email provider configured).
// A temporary password is generated and returned once; the new team member should change it via
// Supabase's own password-reset flow, since there's no "force password change on first login" here.
router.post('/', async (req, res) => {
  const { email, full_name, role } = req.body;

  if (!email || !ROLES.includes(role)) {
    return res.status(400).json({ error: `email and a valid role (${ROLES.join(', ')}) are required` });
  }

  const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!1';

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: full_name || null },
  });

  if (error) return res.status(400).json({ error: error.message });

  // The on_auth_user_created trigger already inserted a profile row with role='admin' — update it
  // to the requested role.
  await supabaseAdmin.from('profiles').update({ role, full_name: full_name || null }).eq('id', created.user.id);

  res.status(201).json({ member: { id: created.user.id, email, role }, temp_password: tempPassword });
});

router.put('/:id', async (req, res) => {
  const { role } = req.body;
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
  }

  const { data, error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ member: data });
});

export default router;
