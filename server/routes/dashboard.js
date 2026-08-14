import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { computeStockStatus } from '../lib/stockStatus.js';

const router = Router();

// Module 1, Executive Dashboard — pure aggregation over data that already exists (Orders,
// Customers, Products, Inventory, Returns). No new tables, same approach as Finance.
router.get('/summary', requireAuth, async (req, res) => {
  const [
    { data: orders, error: ordersError },
    { count: customerCount, error: customersError },
    { count: productCount, error: productsError },
    { data: variants, error: variantsError },
    { data: recentOrders, error: recentError },
    { count: pendingReturnsCount, error: returnsError },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('status, total'),
    supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('product_variants').select('id, size, color, stock_quantity, reserved_quantity, low_stock_threshold, product:products(name)'),
    supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('returns')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(refunded,rejected,exchanged)'),
  ]);

  const firstError = ordersError || customersError || productsError || variantsError || recentError || returnsError;
  if (firstError) return res.status(500).json({ error: firstError.message });

  const cancelledStatuses = new Set(['cancelled', 'refund_completed']);
  const revenueOrders = orders.filter((o) => !cancelledStatuses.has(o.status));
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.total), 0);

  const ordersByStatus = {};
  for (const order of orders) {
    ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
  }

  const lowStockVariants = variants
    .filter((v) => computeStockStatus(v) !== 'in_stock')
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 5)
    .map((v) => ({
      id: v.id,
      productName: v.product ? v.product.name : 'Unknown',
      variantLabel: [v.size, v.color].filter(Boolean).join(' / ') || null,
      stockQuantity: v.stock_quantity,
    }));

  res.json({
    totalOrders: orders.length,
    totalRevenue,
    totalCustomers: customerCount || 0,
    totalActiveProducts: productCount || 0,
    pendingReturns: pendingReturnsCount || 0,
    ordersByStatus,
    lowStockVariants,
    recentOrders,
  });
});

export default router;
