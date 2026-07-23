import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data: influencers, error } = await supabaseAdmin.from('influencers').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('coupon_code, total')
    .not('coupon_code', 'is', null);
  if (ordersError) return res.status(500).json({ error: ordersError.message });

  const salesByCoupon = new Map();
  for (const order of orders) {
    salesByCoupon.set(order.coupon_code, (salesByCoupon.get(order.coupon_code) || 0) + Number(order.total));
  }

  const rows = influencers.map((inf) => {
    const sales = inf.coupon_code ? salesByCoupon.get(inf.coupon_code) || 0 : 0;
    return {
      ...inf,
      sales,
      commission_earned: (sales * inf.commission_percent) / 100,
    };
  });

  res.json({ influencers: rows });
});

router.post('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('influencers').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ influencer: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('influencers')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ influencer: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('influencers').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
