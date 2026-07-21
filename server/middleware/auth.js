import { supabaseAnon } from '../config/supabase.js';

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

  req.user = data.user;
  next();
}

// First release only enforces single-admin access; multi-role checks slot in here later.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.user_metadata?.role ?? 'admin';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
