import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — API calls will fail until server/.env is configured.');
}

// createClient throws on an empty/invalid URL, which would crash the server on boot
// before server/.env is configured — fall back to a syntactically valid placeholder.
const url = SUPABASE_URL || 'https://placeholder.supabase.co';

// Node 20 has no native WebSocket, which the Realtime client requires even though we don't use it — polyfill via `ws`.
const clientOptions = { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } };

// Service-role client: full access, server-side only. Never expose this key to the frontend.
export const supabaseAdmin = createClient(url, SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key', clientOptions);

// Anon client: used to verify user JWTs coming from the admin frontend.
export const supabaseAnon = createClient(url, SUPABASE_ANON_KEY || 'placeholder-anon-key', clientOptions);
