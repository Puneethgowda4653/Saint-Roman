import { Router } from 'express';
import { supabaseAnon, supabaseAdmin } from '../config/supabase.js';

const router = Router();

// ── Middleware: verify customer JWT ──────────────────────────────────
async function requireCustomer(req, res, next) {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid session' });

    req.user = data.user;
    next();
}

router.use(requireCustomer);

// ── Profile ─────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
    const meta = req.user.user_metadata || {};
    res.json({
        id: req.user.id,
        email: req.user.email,
        first_name: meta.first_name || '',
        last_name: meta.last_name || '',
        display_name: meta.display_name || '',
        phone: meta.phone || '',
    });
});

router.put('/profile', async (req, res) => {
    const { first_name, last_name, display_name, phone } = req.body;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        user_metadata: { first_name, last_name, display_name, phone },
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ── Password change ─────────────────────────────────────────────────

router.put('/password', async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        password: new_password,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ── Orders ──────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, status, total, shipping_fee, created_at, order_items(id, product_name, variant_label, quantity, unit_price)')
        .or(`user_id.eq.${req.user.id},customer_email.eq.${req.user.email}`)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ orders: data || [] });
});

router.get('/orders/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(id, product_name, variant_label, quantity, unit_price, image_url)')
        .eq('id', req.params.id)
        .or(`user_id.eq.${req.user.id},customer_email.eq.${req.user.email}`)
        .single();

    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: data });
});

// ── Addresses ───────────────────────────────────────────────────────

router.get('/addresses', async (req, res) => {
    const { data } = await supabaseAdmin
        .from('customer_addresses')
        .select('*')
        .eq('user_id', req.user.id);

    const billing = (data || []).find(a => a.type === 'billing') || null;
    const shipping = (data || []).find(a => a.type === 'shipping') || null;
    res.json({ billing, shipping });
});

router.put('/addresses', async (req, res) => {
    const { type, full_name, phone, address_line1, address_line2, city, state, postal_code, country } = req.body;
    if (!type || !['billing', 'shipping'].includes(type))
        return res.status(400).json({ error: 'type must be billing or shipping' });

    const row = { user_id: req.user.id, type, full_name, phone, address_line1, address_line2, city, state, postal_code, country: country || 'India', updated_at: new Date().toISOString() };

    const { data: existing } = await supabaseAdmin
        .from('customer_addresses').select('id').eq('user_id', req.user.id).eq('type', type).maybeSingle();

    let error;
    if (existing) {
        ({ error } = await supabaseAdmin.from('customer_addresses').update(row).eq('id', existing.id));
    } else {
        ({ error } = await supabaseAdmin.from('customer_addresses').insert(row));
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ── Wishlist ────────────────────────────────────────────────────────

router.get('/wishlist', async (req, res) => {
    const { data } = await supabaseAdmin
        .from('customer_wishlist')
        .select('id, product_id, created_at, products:product_id(id, name, slug, image_url, base_price, compare_at_price, status)')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    const items = (data || []).map(w => ({
        wishlist_id: w.id,
        ...w.products,
        added_at: w.created_at,
    }));
    res.json({ wishlist: items });
});

router.post('/wishlist', async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });

    const { error } = await supabaseAdmin
        .from('customer_wishlist')
        .upsert({ user_id: req.user.id, product_id }, { onConflict: 'user_id,product_id' });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

router.delete('/wishlist/:productId', async (req, res) => {
    const { error } = await supabaseAdmin
        .from('customer_wishlist')
        .delete()
        .eq('user_id', req.user.id)
        .eq('product_id', req.params.productId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

export default router;