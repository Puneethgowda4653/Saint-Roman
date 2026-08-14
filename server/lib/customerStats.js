import { supabaseAdmin } from '../config/supabase.js';

// Computes each customer's order_count + lifetime_value from real orders each time it's called
// (never stored/cached, so it can't go stale) — shared by the admin Customers list
// (routes/customers.js) and CRM segment evaluation (routes/crm.js), so both always agree on the
// same live snapshot instead of two independent copies of this join drifting apart.
export async function loadCustomersWithStats() {
  const { data, error } = await supabaseAdmin.from('customers').select('id, name, email, phone, notes, orders(id, total)');
  if (error) throw new Error(error.message);
  return data.map(({ orders, ...customer }) => ({
    ...customer,
    order_count: orders.length,
    lifetime_value: orders.reduce((sum, o) => sum + Number(o.total), 0),
  }));
}
