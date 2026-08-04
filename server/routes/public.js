import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { validateCoupon } from '../lib/coupons.js';

const router = Router();

// Unauthenticated — served to the public storefront (html/), unlike every other route in this
// server which requires an admin JWT. Only exposes fields safe for a shopper to see, and only
// active/published rows (no drafts, no cost price, no internal fields like HSN/barcode).

router.get('/products', async (req, res) => {
  let query = supabaseAdmin
    .from('products')
    .select('id, name, slug, description, image_url, base_price, compare_at_price, category:categories(id, name, slug), product_variants(id, size, color, price, stock_quantity)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Optional ?category=<slug> — resolve the slug to an id first, since Supabase can't filter
  // on a joined table's column directly without an !inner join.
  const categorySlug = req.query.category;
  if (categorySlug) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();

    if (categoryError) return res.status(500).json({ error: categoryError.message });
    if (!category) return res.json({ products: [] }); // unknown slug — no matches, not an error

    query = query.eq('category_id', category.id);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

router.get('/products/:slug', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, description, base_price, compare_at_price, category:categories(id, name, slug), product_variants(id, size, color, price, stock_quantity), product_images(url, alt_text, position)')
    .eq('slug', req.params.slug)
    .eq('status', 'active')
    .single();

  if (error) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: data });
});

router.get('/categories', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ categories: data });
});

router.get('/faqs', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('faqs')
    .select('id, question, answer')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ faqs: data });
});

router.get('/site-content', async (req, res) => {
  const [{ data: settings }, { data: banners }] = await Promise.all([
    supabaseAdmin.from('settings').select('site_title, announcement_text, footer_copyright_text, maintenance_mode').single(),
    supabaseAdmin.from('banners').select('id, title, subtitle, link_url, image_url, badge_text, placement').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  res.json({ settings: settings || {}, banners: banners || [] });
});

// New endpoint: homepage offer banners only
router.get('/banners', async (req, res) => {
  const placement = req.query.placement || null;

  let query = supabaseAdmin
    .from('banners')
    .select('id, title, subtitle, link_url, image_url, badge_text, placement')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (placement) {
    query = query.eq('placement', placement);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ banners: data || [] });
});

router.post('/support-tickets', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  let customerId = null;
  if (email) {
    const { data: existingCustomer } = await supabaseAdmin.from('customers').select('id').eq('email', email).maybeSingle();
    customerId = existingCustomer ? existingCustomer.id : null;
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      customer_id: customerId,
      customer_name: name,
      customer_email: email || null,
      customer_phone: phone || null,
      subject: subject || 'Contact form submission',
      message,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ ticket: { id: data.id } });
});

router.post('/coupons/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await validateCoupon(code, Number(subtotal) || 0);
  res.json(result);
});

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ELL-${stamp}-${rand}`;
}

// Real checkout, unauthenticated. Never trusts client-supplied prices or product names —
// looks up each variant server-side by id and prices the order from that. Cash-on-delivery
// only (no payment gateway configured), so there's no payment step here beyond recording the order.
router.post('/orders', async (req, res) => {
  const { customer_name, customer_email, customer_phone, shipping_address, notes, items, coupon_code } = req.body;

  if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Name, phone, and at least one cart item are required' });
  }

  const variantIds = items.map((item) => item.variant_id);
  const { data: variants, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id, size, color, price, stock_quantity, product:products(id, name)')
    .in('id', variantIds);

  if (variantsError) return res.status(500).json({ error: variantsError.message });

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const lineItems = [];

  for (const item of items) {
    const variant = variantMap.get(item.variant_id);
    if (!variant) return res.status(400).json({ error: `Unknown product: ${item.variant_id}` });

    const quantity = Math.max(1, Number(item.quantity) || 1);
    if (variant.stock_quantity < quantity) {
      return res.status(400).json({ error: `${variant.product.name} only has ${variant.stock_quantity} left in stock` });
    }

    lineItems.push({
      variant_id: variant.id,
      product_name: variant.product.name,
      variant_label: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
      quantity,
      unit_price: variant.price,
      line_total: variant.price * quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  // Re-validate the coupon server-side — never trust a discount amount computed on the client.
  let discountAmount = 0;
  let appliedCouponCode = null;
  let appliedCouponUsageCount = 0;
  if (coupon_code) {
    const couponResult = await validateCoupon(coupon_code, subtotal);
    if (!couponResult.valid) {
      return res.status(400).json({ error: couponResult.reason || 'Coupon is not valid' });
    }
    discountAmount = couponResult.discount;
    appliedCouponCode = couponResult.code;
    appliedCouponUsageCount = couponResult.usage_count;
  }

  const total = Math.max(0, subtotal - discountAmount);

  // --- Customer upsert (by phone, since we don't have auth) ---
  let customerId = null;
  {
    const { data: existingCustomer } = await supabaseAdmin.from('customers').select('id').eq('phone', customer_phone).maybeSingle();
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({ name: customer_name, email: customer_email || null, phone: customer_phone, address: shipping_address || null })
        .select('id')
        .single();
      if (customerError) return res.status(500).json({ error: customerError.message });
      customerId = newCustomer.id;
    }
  }

  // --- Create the order ---
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customerId,
      customer_name,
      customer_email: customer_email || null,
      customer_phone,
      shipping_address: shipping_address || null,
      notes: notes || null,
      subtotal,
      discount_amount: discountAmount,
      coupon_code: appliedCouponCode,
      total,
      status: 'pending',
      payment_method: 'cod',
      payment_status: 'unpaid',
    })
    .select('id, order_number')
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  // --- Insert order items ---
  const orderItems = lineItems.map((li) => ({
    order_id: order.id,
    variant_id: li.variant_id,
    product_name: li.product_name,
    variant_label: li.variant_label,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: li.line_total,
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // --- Decrement stock ---
  for (const li of lineItems) {
    await supabaseAdmin.rpc('decrement_stock', { p_variant_id: li.variant_id, p_qty: li.quantity }).catch(() => { });
  }

  // --- Increment coupon usage ---
  if (appliedCouponCode) {
    await supabaseAdmin
      .from('coupons')
      .update({ usage_count: appliedCouponUsageCount + 1 })
      .eq('code', appliedCouponCode)
      .catch(() => { });
  }

  res.status(201).json({ order: { id: order.id, order_number: order.order_number } });
});

export default router;