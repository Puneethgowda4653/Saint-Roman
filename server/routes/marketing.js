import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// List campaigns with attributed performance computed from real orders.
// A campaign's revenue/orders come from orders whose coupon_code matches the campaign's
// coupon_code — never manually entered. ROAS = attributed revenue / spend.
router.get('/', requireAuth, async (req, res) => {
  const { data: campaigns, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('coupon_code, total')
    .not('coupon_code', 'is', null);
  if (ordersError) return res.status(500).json({ error: ordersError.message });

  const statsByCoupon = new Map();
  for (const order of orders) {
    const s = statsByCoupon.get(order.coupon_code) || { revenue: 0, orders: 0 };
    s.revenue += Number(order.total);
    s.orders += 1;
    statsByCoupon.set(order.coupon_code, s);
  }

  const rows = campaigns.map((c) => {
    const stat = c.coupon_code ? statsByCoupon.get(c.coupon_code) : null;
    const revenue = stat ? stat.revenue : 0;
    const attributedOrders = stat ? stat.orders : 0;
    const spend = Number(c.spend);
    return {
      ...c,
      attributed_revenue: revenue,
      attributed_orders: attributedOrders,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : null,
    };
  });

  const summary = {
    total_spend: rows.reduce((sum, r) => sum + Number(r.spend), 0),
    attributed_revenue: rows.reduce((sum, r) => sum + r.attributed_revenue, 0),
    attributed_orders: rows.reduce((sum, r) => sum + r.attributed_orders, 0),
  };
  summary.overall_roas =
    summary.total_spend > 0
      ? Number((summary.attributed_revenue / summary.total_spend).toFixed(2))
      : null;

  res.json({ campaigns: rows, summary });
});

router.post('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .insert(req.body)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ campaign: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('marketing_campaigns')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ campaign: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('marketing_campaigns').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
