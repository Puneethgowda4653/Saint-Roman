import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Module 16, Reports & Analytics — first pass. Every report here aggregates data that already
// exists; no Marketing Report (no ad platform data), Warehouse Report (no warehouse ops module),
// or Employee Report (only a single admin user exists — no staff records). "Export Excel/PDF" and
// "Schedule Reports" from the spec are replaced with client-side CSV export (no server-side
// document generation or job scheduler in this stack) — see ReportsPage.tsx.

async function salesReport() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('order_number, customer_name, created_at, status, subtotal, discount_amount, total')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return {
    title: 'Sales Report',
    columns: [
      { key: 'order_number', label: 'Order #' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'created_at', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'discount_amount', label: 'Discount' },
      { key: 'total', label: 'Total' },
    ],
    rows: data,
  };
}

async function customerReport() {
  const { data, error } = await supabaseAdmin.from('customers').select('name, email, phone, created_at, orders(total)');
  if (error) throw error;
  const rows = data.map(({ orders, ...customer }) => ({
    ...customer,
    order_count: orders.length,
    lifetime_value: orders.reduce((sum, o) => sum + Number(o.total), 0),
  }));
  return {
    title: 'Customer Report',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'order_count', label: 'Orders' },
      { key: 'lifetime_value', label: 'Lifetime Value' },
    ],
    rows,
  };
}

async function inventoryReport() {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('sku, size, color, stock_quantity, reserved_quantity, product:products(name)')
    .order('stock_quantity', { ascending: true });
  if (error) throw error;
  const rows = data.map((v) => ({
    product_name: v.product ? v.product.name : 'Unknown',
    variant: [v.size, v.color].filter(Boolean).join(' / ') || '—',
    sku: v.sku || '—',
    stock_quantity: v.stock_quantity,
    reserved_quantity: v.reserved_quantity,
    available: v.stock_quantity - v.reserved_quantity,
  }));
  return {
    title: 'Inventory Report',
    columns: [
      { key: 'product_name', label: 'Product' },
      { key: 'variant', label: 'Variant' },
      { key: 'sku', label: 'SKU' },
      { key: 'stock_quantity', label: 'On hand' },
      { key: 'reserved_quantity', label: 'Reserved' },
      { key: 'available', label: 'Available' },
    ],
    rows,
  };
}

async function productReport() {
  const { data: items, error } = await supabaseAdmin.from('order_items').select('product_name, quantity, line_total');
  if (error) throw error;

  const byProduct = new Map();
  for (const item of items) {
    const existing = byProduct.get(item.product_name) || { product_name: item.product_name, units_sold: 0, revenue: 0 };
    existing.units_sold += item.quantity;
    existing.revenue += Number(item.line_total);
    byProduct.set(item.product_name, existing);
  }

  const rows = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  return {
    title: 'Product Performance Report',
    columns: [
      { key: 'product_name', label: 'Product' },
      { key: 'units_sold', label: 'Units sold' },
      { key: 'revenue', label: 'Revenue' },
    ],
    rows,
  };
}

async function returnsReport() {
  const { data, error } = await supabaseAdmin
    .from('returns')
    .select('created_at, quantity, reason, status, refund_amount, order:orders(order_number, customer_name), order_item:order_items(product_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data.map((r) => ({
    order_number: r.order ? r.order.order_number : '—',
    customer_name: r.order ? r.order.customer_name : '—',
    product_name: r.order_item ? r.order_item.product_name : '—',
    quantity: r.quantity,
    reason: r.reason || '—',
    status: r.status,
    refund_amount: r.refund_amount || 0,
  }));

  return {
    title: 'Return Report',
    columns: [
      { key: 'order_number', label: 'Order #' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'product_name', label: 'Product' },
      { key: 'quantity', label: 'Qty' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { key: 'refund_amount', label: 'Refund' },
    ],
    rows,
  };
}

async function profitReport() {
  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('product_name, quantity, unit_price, variant:product_variants(product:products(cost_price))');
  if (error) throw error;

  const byProduct = new Map();
  for (const item of items) {
    const costPrice = item.variant && item.variant.product ? item.variant.product.cost_price : null;
    const existing = byProduct.get(item.product_name) || {
      product_name: item.product_name,
      units_sold: 0,
      revenue: 0,
      profit: null,
    };
    existing.units_sold += item.quantity;
    existing.revenue += item.unit_price * item.quantity;
    if (costPrice != null) {
      const lineProfit = (item.unit_price - costPrice) * item.quantity;
      existing.profit = (existing.profit || 0) + lineProfit;
    }
    byProduct.set(item.product_name, existing);
  }

  const rows = [...byProduct.values()].map((r) => ({
    ...r,
    profit: r.profit != null ? r.profit : 'No cost price set',
  }));

  return {
    title: 'Profit Report',
    columns: [
      { key: 'product_name', label: 'Product' },
      { key: 'units_sold', label: 'Units sold' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'profit', label: 'Profit' },
    ],
    rows,
  };
}

const REPORTS = {
  sales: salesReport,
  customers: customerReport,
  inventory: inventoryReport,
  products: productReport,
  returns: returnsReport,
  profit: profitReport,
};

router.get('/:type', requireAuth, async (req, res) => {
  const handler = REPORTS[req.params.type];
  if (!handler) return res.status(404).json({ error: `Unknown report type: ${req.params.type}` });

  try {
    const report = await handler();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
