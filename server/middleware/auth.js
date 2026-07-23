import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';

// Verifies the Supabase access token sent from the admin frontend and attaches the user + role to req.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // The real role lives in `profiles.role` (set by the on_auth_user_created trigger, editable by
  // admins via TeamPage.tsx) — NOT `user_metadata.role`, which is never written anywhere. Reading
  // from user_metadata here used to make requireRole() silently always pass as 'admin'.
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', data.user.id).single();

  req.user = { ...data.user, role: profile ? profile.role : 'admin' };
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }
    next();
  };
}
