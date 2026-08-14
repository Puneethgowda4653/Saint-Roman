import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { computeStockStatus } from '../lib/stockStatus.js';

const router = Router();

// Module 21, Notifications — "Internal Alerts" only. Email/SMS/WhatsApp/Push/Slack all need a
// real provider (none configured), so there's nothing to build for those channels. Rather than a
// persisted table that would need write-side instrumentation on every order/return/ticket/stock
// change (a lot of routes to touch for marginal benefit), this derives a live feed straight from
// existing data each time it's requested — same approach as the Dashboard and Reports.
router.get('/', requireAuth, async (req, res) => {
  const [{ data: recentOrders }, { data: allVariants }, { data: pendingReturns }, { data: openTickets }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    // Fetched unfiltered and checked in JS below (not `.lte('stock_quantity', ...)`) since the
    // threshold is now per-variant (product_variants.low_stock_threshold) — same reasoning as
    // dashboard.js's low-stock widget.
    supabaseAdmin
      .from('product_variants')
      .select('id, size, color, stock_quantity, reserved_quantity, low_stock_threshold, product:products(name)'),
    supabaseAdmin
      .from('returns')
      .select('id, quantity, order:orders(order_number)')
      .not('status', 'in', '(refunded,rejected,exchanged)'),
    supabaseAdmin.from('support_tickets').select('id, subject, customer_name').eq('status', 'open'),
  ]);

  const notifications = [];

  for (const order of recentOrders || []) {
    notifications.push({
      id: `order-${order.id}`,
      type: 'order',
      message: `New order ${order.order_number} from ${order.customer_name}`,
      createdAt: order.created_at,
    });
  }

  const lowStockVariants = (allVariants || []).filter((v) => computeStockStatus(v) !== 'in_stock');
  for (const variant of lowStockVariants) {
    const label = [variant.size, variant.color].filter(Boolean).join(' / ');
    notifications.push({
      id: `stock-${variant.id}`,
      type: 'low_stock',
      message: `Low stock: ${variant.product ? variant.product.name : 'Unknown'} (${label}) — ${variant.stock_quantity} left`,
      createdAt: null,
    });
  }

  for (const ret of pendingReturns || []) {
    notifications.push({
      id: `return-${ret.id}`,
      type: 'return',
      message: `Return pending for order ${ret.order ? ret.order.order_number : '—'} (qty ${ret.quantity})`,
      createdAt: null,
    });
  }

  for (const ticket of openTickets || []) {
    notifications.push({
      id: `ticket-${ticket.id}`,
      type: 'support',
      message: `Open ticket from ${ticket.customer_name}: ${ticket.subject}`,
      createdAt: null,
    });
  }

  res.json({ notifications, count: notifications.length });
});

export default router;
