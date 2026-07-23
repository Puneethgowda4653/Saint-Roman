import { supabaseAdmin } from '../config/supabase.js';

// Shared between the public /coupons/validate endpoint (used for the live preview while typing
// a code at checkout) and order creation (re-validated server-side, never trusts a client-supplied
// discount amount).
export async function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: 'No coupon code provided' };

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();

  if (error || !coupon) return { valid: false, message: 'Invalid coupon code' };
  if (!coupon.is_active) return { valid: false, message: 'This coupon is no longer active' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, message: 'This coupon has expired' };
  }
  if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, message: 'This coupon has reached its usage limit' };
  }
  if (subtotal < coupon.min_order_value) {
    return { valid: false, message: `Minimum order value for this coupon is ₹${coupon.min_order_value}` };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  } else if (coupon.type === 'flat') {
    discount = coupon.value;
  }
  // 'free_shipping' contributes 0 to the item discount — shipping is already free in this build,
  // so it's accepted as valid but has no numeric effect yet.
  discount = Math.min(discount, subtotal);

  return { valid: true, discount, coupon };
}
