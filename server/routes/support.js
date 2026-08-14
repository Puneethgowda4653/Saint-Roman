import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// Applies every filter except `status` (used separately so tab counts can respect
// search/priority too) — same split as applyFilters() in server/routes/orders.js.
function applyFilters(query, { priority, search }) {
  if (priority) query = query.eq('priority', priority);
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `ticket_number.ilike.${term},customer_name.ilike.${term},customer_email.ilike.${term},subject.ilike.${term},message.ilike.${term}`
    );
  }
  return query;
}

router.get('/', requireAuth, async (req, res) => {
  const { status, priority, search } = req.query;
  const filterParams = { priority, search };

  let query = applyFilters(supabaseAdmin.from('support_tickets').select('*'), filterParams);
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Tab counts computed off the same search/priority filters (minus status), so counts reflect
  // "how many open tickets match the current search" rather than a global unfiltered count —
  // same behaviour as the Orders page's status tabs.
  const countsQuery = applyFilters(supabaseAdmin.from('support_tickets').select('status'), filterParams);
  const { data: countsRows, error: countsError } = await countsQuery;
  if (countsError) return res.status(500).json({ error: countsError.message });

  const counts = { all: countsRows.length };
  for (const s of STATUSES) counts[s] = 0;
  for (const row of countsRows) counts[row.status] = (counts[row.status] || 0) + 1;

  res.json({ tickets: data, counts });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, priority, internal_note } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    patch.status = status;
    patch.resolved_at = status === 'resolved' || status === 'closed' ? new Date().toISOString() : null;
  }
  if (priority !== undefined) patch.priority = priority;
  if (internal_note !== undefined) patch.internal_note = internal_note;

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
