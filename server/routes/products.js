import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

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

  const { data: updated, error } = await supabaseAdmin
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (Array.isArray(variants)) {
    await supabaseAdmin.from('product_variants').delete().eq('product_id', req.params.id);
    if (variants.length > 0) {
      const rows = variants.map((v) => ({ ...v, product_id: req.params.id }));
      const { error: variantError } = await supabaseAdmin.from('product_variants').insert(rows);
      if (variantError) return res.status(400).json({ error: variantError.message });
    }
  }

  res.json({ product: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('products').delete().eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
