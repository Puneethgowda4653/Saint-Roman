import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { computeStockStatus } from '../lib/stockStatus.js';
import * as wa from '../lib/whatsapp.js';

const router = Router();

const STATUS_RANK = { in_stock: 0, low_stock: 1, out_of_stock: 2 };

// Applies every filter except `stock_status` (used separately so tab counts reflect the other
// active filters) — same split as applyFilters() in server/routes/orders.js.
function applyFilters(query, { search, category }) {
  if (category) query = query.eq('products.category_id', category);
  if (search) {
    const term = `%${search}%`;
    query = query.or(`sku.ilike.${term},products.name.ilike.${term}`);
  }
  return query;
}

const VARIANT_SELECT =
  'id, sku, size, color, price, stock_quantity, reserved_quantity, low_stock_threshold, products!inner(id, name, image_url, category_id, category:categories(id, name))';

// Renames the PostgREST embed key (products, plural — required unaliased so `.eq`/`.or` filters
// above can reference it) back to a clean singular `product` for the response, so the frontend
// isn't stuck naming a single joined product "products".
function decorate(variant) {
  const { products: product, ...rest } = variant;
  return { ...rest, product, available: variant.stock_quantity - variant.reserved_quantity, status: computeStockStatus(variant) };
}

router.get('/', requireAuth, async (req, res) => {
  const { search, category, stock_status } = req.query;
  const filterParams = { search, category };

  let query = applyFilters(supabaseAdmin.from('product_variants').select(VARIANT_SELECT), filterParams).order('stock_quantity', { ascending: true });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let variants = (data || []).map(decorate);

  const counts = { all: variants.length, in_stock: 0, low_stock: 0, out_of_stock: 0 };
  for (const v of variants) counts[v.status] += 1;

  if (stock_status) variants = variants.filter((v) => v.status === stock_status);

  res.json({ variants, counts });
});

router.get('/:variantId/history', requireAuth, async (req, res) => {
  const [{ data: adjustments, error }, { data: usersData, error: usersError }] = await Promise.all([
    supabaseAdmin.from('inventory_adjustments').select('*').eq('variant_id', req.params.variantId).order('created_at', { ascending: false }),
    supabaseAdmin.auth.admin.listUsers(),
  ]);

  if (error) return res.status(500).json({ error: error.message });
  if (usersError) return res.status(500).json({ error: usersError.message });

  const emailById = new Map(usersData.users.map((u) => [u.id, u.email]));
  const decorated = (adjustments || []).map((a) => ({ ...a, actor_email: a.created_by ? emailById.get(a.created_by) || null : null }));

  res.json({ adjustments: decorated });
});

// Lets ops set a per-SKU low-stock threshold instead of everyone sharing one global number (a
// fast-moving product and a slow one shouldn't share an alert line) — null resets to the default.
router.put('/:variantId/threshold', requireAuth, async (req, res) => {
  const { low_stock_threshold } = req.body;
  const isEmpty = low_stock_threshold === null || low_stock_threshold === '' || low_stock_threshold === undefined;
  const value = isEmpty ? null : Number(low_stock_threshold);

  if (!isEmpty && (!Number.isFinite(value) || value < 0)) {
    return res.status(400).json({ error: 'low_stock_threshold must be a non-negative number, or empty to reset to the default' });
  }

  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .update({ low_stock_threshold: value, updated_at: new Date().toISOString() })
    .eq('id', req.params.variantId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ variant: data });
});

// Best-effort — fires the same WhatsApp send wrapper built for the Auto-Reply bot
// (server/lib/whatsapp.js) at a store-ops number configured on Settings, rather than a second
// messaging integration. Silently no-ops if WhatsApp isn't configured or no alert number is set,
// same "works without a key, just doesn't send" pattern already used by the AI Control Center.
async function sendLowStockAlert(variantId, newStatus) {
  try {
    if (!wa.isConfigured()) return;

    const { data: settings } = await supabaseAdmin.from('settings').select('low_stock_alert_phone').eq('id', 1).maybeSingle();
    const phone = settings?.low_stock_alert_phone;
    if (!phone) return;

    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('sku, size, color, stock_quantity, product:products(name)')
      .eq('id', variantId)
      .maybeSingle();
    if (!variant) return;

    const label = [variant.size, variant.color].filter(Boolean).join(' / ');
    const statusLabel = newStatus === 'out_of_stock' ? 'OUT OF STOCK' : 'LOW STOCK';
    const text = `⚠️ ${statusLabel}: ${variant.product?.name ?? 'Unknown product'}${label ? ` (${label})` : ''} — ${variant.stock_quantity} left${variant.sku ? ` · SKU ${variant.sku}` : ''}`;
    await wa.sendText(phone, text);
  } catch (err) {
    console.error('[inventory] failed to send low-stock alert', err);
  }
}

router.post('/adjust', requireAuth, async (req, res) => {
  const { variant_id, change_quantity, reason, note } = req.body;

  if (!variant_id || !change_quantity || !reason) {
    return res.status(400).json({ error: 'variant_id, change_quantity, and reason are required' });
  }

  const { data: variant, error: fetchError } = await supabaseAdmin
    .from('product_variants')
    .select('stock_quantity, reserved_quantity, low_stock_threshold')
    .eq('id', variant_id)
    .single();

  if (fetchError) return res.status(404).json({ error: fetchError.message });

  const newQuantity = Math.max(0, variant.stock_quantity + Number(change_quantity));
  const prevStatus = computeStockStatus(variant);
  const newStatus = computeStockStatus({ ...variant, stock_quantity: newQuantity });

  const { error: updateError } = await supabaseAdmin
    .from('product_variants')
    .update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', variant_id);

  if (updateError) return res.status(400).json({ error: updateError.message });

  const { error: logError } = await supabaseAdmin.from('inventory_adjustments').insert({
    variant_id,
    change_quantity: Number(change_quantity),
    reason,
    note: note || null,
    created_by: req.user.id,
  });

  if (logError) return res.status(400).json({ error: logError.message });

  // Fire-and-forget — never let a slow/unconfigured WhatsApp call delay the stock-adjust response.
  if (STATUS_RANK[newStatus] > STATUS_RANK[prevStatus]) {
    sendLowStockAlert(variant_id, newStatus);
  }

  res.json({ stock_quantity: newQuantity });
});

export default router;
