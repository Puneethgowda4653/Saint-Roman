import { supabaseAdmin } from '../config/supabase.js';

// Fire-and-forget — an audit log failure should never break the actual action it's logging.
export async function logAudit({ actorEmail, action, entityType, entityId, details }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_email: actorEmail || null,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      details: details || null,
    });
  } catch {
    // swallow — logging must never break the underlying request
  }
}
