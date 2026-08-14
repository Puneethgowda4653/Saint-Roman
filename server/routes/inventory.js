import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Same threshold already used by dashboard.js/notifications.js for their own low-stock signals —
// kept in sync by hand (no shared package between route files in this project).
const LOW_STOCK_THRESHOLD = 10;

function stockStatus(variant) {
  const available = variant.stock_quantity - variant.reserved_quantity;
  if (available <= 0) return 'out_of_stock';
  if (variant.stock_quantity <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

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

const VARIANT_SELECT = 'id, sku, size, color, price, stock_quantity, reserved_quantity, products!inner(id, name, image_url, category_id, category:categories(id, name))';

// Renames the PostgREST embed key (products, plural — required unaliased so `.eq`/`.or` filters
// above can reference it) back to a clean singular `product` for the response, so the frontend
// isn't stuck naming a single joined product "products".
function decorate(variant) {
  const { products: product, ...rest } = variant;
  return { ...rest, product, available: variant.stock_quantity - variant.reserved_quantity, status: stockStatus(variant) };
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

router.post('/adjust', requireAuth, async (req, res) => {
  const { variant_id, change_quantity, reason, note } = req.body;

  if (!variant_id || !change_quantity || !reason) {
    return res.status(400).json({ error: 'variant_id, change_quantity, and reason are required' });
  }

  const { data: variant, error: fetchError } = await supabaseAdmin
    .from('product_variants')
    .select('stock_quantity')
    .eq('id', variant_id)
    .single();

  if (fetchError) return res.status(404).json({ error: fetchError.message });

  const newQuantity = Math.max(0, variant.stock_quantity + Number(change_quantity));

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

  res.json({ stock_quantity: newQuantity });
});

export default router;
