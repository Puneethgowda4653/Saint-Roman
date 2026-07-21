import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// Unauthenticated — served to the public storefront (html/), unlike every other route in this
// server which requires an admin JWT. Only exposes fields safe for a shopper to see, and only
// active/published rows (no drafts, no cost price, no internal fields like HSN/barcode).

router.get('/products', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, description, base_price, compare_at_price, category:categories(id, name, slug), product_variants(id, size, color, price, stock_quantity)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

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

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ELL-${stamp}-${rand}`;
}

// Real checkout, unauthenticated. Never trusts client-supplied prices or product names —
// looks up each variant server-side by id and prices the order from that. Cash-on-delivery
// only (no payment gateway configured), so there's no payment step here beyond recording the order.
router.post('/orders', async (req, res) => {
  const { customer_name, customer_email, customer_phone, shipping_address, notes, items } = req.body;

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

  // Match or create a customer record by email, so repeat shoppers accumulate real order history.
  let customerId = null;
  if (customer_email) {
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', customer_email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabaseAdmin
        .from('customers')
        .insert({ name: customer_name, email: customer_email, phone: customer_phone })
        .select('id')
        .single();
      customerId = newCustomer ? newCustomer.id : null;
    }
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customerId,
      customer_name,
      customer_email: customer_email || null,
      customer_phone,
      shipping_address: shipping_address || null,
      subtotal,
      shipping_fee: 0,
      total: subtotal,
      notes: notes || null,
    })
    .select()
    .single();

  if (orderError) return res.status(400).json({ error: orderError.message });

  const orderItemRows = lineItems.map((item) => ({ ...item, order_id: order.id }));
  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemRows);
  if (itemsError) return res.status(400).json({ error: itemsError.message });

  for (const item of lineItems) {
    const variant = variantMap.get(item.variant_id);
    await supabaseAdmin
      .from('product_variants')
      .update({ stock_quantity: variant.stock_quantity - item.quantity })
      .eq('id', item.variant_id);
  }

  res.status(201).json({ order: { id: order.id, order_number: order.order_number, total: order.total } });
});

export default router;
