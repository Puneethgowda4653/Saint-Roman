import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { loadCustomersWithStats } from '../lib/customerStats.js';

const router = Router();

function matches(customer, segment) {
  return (
    customer.order_count >= segment.min_orders &&
    customer.lifetime_value >= Number(segment.min_spend)
  );
}

router.get('/segments', requireAuth, async (req, res) => {
  try {
    const [{ data: segments, error }, customers] = await Promise.all([
      supabaseAdmin.from('customer_segments').select('*').order('created_at', { ascending: false }),
      loadCustomersWithStats(),
    ]);
    if (error) return res.status(500).json({ error: error.message });

    const rows = segments.map((seg) => {
      const members = customers.filter((c) => matches(c, seg));
      return {
        ...seg,
        member_count: members.length,
        members,
      };
    });

    res.json({ segments: rows, total_customers: customers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/segments', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('customer_segments')
    .insert({
      name: req.body.name,
      description: req.body.description ?? null,
      min_orders: Number(req.body.min_orders) || 0,
      min_spend: Number(req.body.min_spend) || 0,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ segment: data });
});

router.delete('/segments/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('customer_segments').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
