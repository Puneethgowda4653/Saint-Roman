import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(id, name), product_variants(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(id, name), product_variants(*), product_images(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json({ product: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { variants, ...product } = req.body;

  const { data: created, error } = await supabaseAdmin.from('products').insert(product).select().single();
  if (error) return res.status(400).json({ error: error.message });

  if (Array.isArray(variants) && variants.length > 0) {
    const rows = variants.map((v) => ({ ...v, product_id: created.id }));
    const { error: variantError } = await supabaseAdmin.from('product_variants').insert(rows);
    if (variantError) return res.status(400).json({ error: variantError.message });
  }

  res.status(201).json({ product: created });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { variants, ...product } = req.body;

  const { data: before } = await supabaseAdmin.from('products').select('base_price, name').eq('id', req.params.id).single();

  const { data: updated, error } = await supabaseAdmin
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (before && product.base_price !== undefined && Number(before.base_price) !== Number(product.base_price)) {
    logAudit({
      actorEmail: req.user.email,
      action: 'price_change',
      entityType: 'product',
      entityId: req.params.id,
      details: { name: before.name, old_price: before.base_price, new_price: product.base_price },
    });
  }

  // Upsert by (size, color) instead of delete-then-recreate — the earlier approach minted a fresh
  // id for every variant on every product edit, which via order_items.variant_id's ON DELETE SET
  // NULL silently orphaned all historical order/order_item links to that variant (breaking anything
  // that joins back through variant_id, e.g. the Profit Report). Preserving ids for variants whose
  // (size, color) still exists keeps that history intact; only genuinely removed variants are deleted.
  if (Array.isArray(variants)) {
    const { data: existingVariants } = await supabaseAdmin
      .from('product_variants')
      .select('id, size, color')
      .eq('product_id', req.params.id);

    const existingByKey = new Map((existingVariants || []).map((v) => [`${v.size}|${v.color}`, v.id]));
    const submittedKeys = new Set(variants.map((v) => `${v.size}|${v.color}`));

    const toUpdate = [];
    const toInsert = [];
    for (const v of variants) {
      const key = `${v.size}|${v.color}`;
      const existingId = existingByKey.get(key);
      if (existingId) {
        toUpdate.push({ ...v, id: existingId, product_id: req.params.id });
      } else {
        toInsert.push({ ...v, product_id: req.params.id });
      }
    }

    const idsToDelete = (existingVariants || [])
      .filter((v) => !submittedKeys.has(`${v.size}|${v.color}`))
      .map((v) => v.id);

    if (idsToDelete.length > 0) {
      await supabaseAdmin.from('product_variants').delete().in('id', idsToDelete);
    }
    if (toUpdate.length > 0) {
      const { error: updateError } = await supabaseAdmin.from('product_variants').upsert(toUpdate);
      if (updateError) return res.status(400).json({ error: updateError.message });
    }
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('product_variants').insert(toInsert);
      if (insertError) return res.status(400).json({ error: insertError.message });
    }
  }

  res.json({ product: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { data: deleted } = await supabaseAdmin.from('products').select('name').eq('id', req.params.id).single();

  const { error } = await supabaseAdmin.from('products').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  logAudit({
    actorEmail: req.user.email,
    action: 'delete',
    entityType: 'product',
    entityId: req.params.id,
    details: { name: deleted ? deleted.name : undefined },
  });

  res.status(204).send();
});

export default router;
