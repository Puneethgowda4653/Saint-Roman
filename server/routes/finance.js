import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// First pass: aggregates directly from orders + returns. No invoices/payouts/vendor-payments
// tables yet — there's no real data source for those (no vendors, no payout runs), so building
// UI for them now would be speculative. Revisit once those actually exist.
router.get('/summary', requireAuth, async (req, res) => {
  const [{ data: orders, error: ordersError }, { data: returns, error: returnsError }] = await Promise.all([
    supabaseAdmin.from('orders').select('status, total, created_at'),
    supabaseAdmin.from('returns').select('status, refund_amount'),
  ]);

  if (ordersError) return res.status(500).json({ error: ordersError.message });
  if (returnsError) return res.status(500).json({ error: returnsError.message });

  const cancelledStatuses = new Set(['cancelled', 'refund_completed']);
  const revenueOrders = orders.filter((o) => !cancelledStatuses.has(o.status));

  const totalRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalRefunds = returns
    .filter((r) => r.status === 'refunded')
    .reduce((sum, r) => sum + Number(r.refund_amount || 0), 0);

  const ordersByStatus = {};
  for (const order of orders) {
    ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
  }

  res.json({
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
    orderCount: orders.length,
    averageOrderValue: revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0,
    pendingReturns: returns.filter((r) => !['refunded', 'rejected', 'exchanged'].includes(r.status)).length,
    ordersByStatus,
  });
});

export default router;
