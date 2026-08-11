import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// --- Blog posts ---

// The admin form derives `slug` from the title client-side with no collision check, so two
// posts titled the same (or edited to the same title) would otherwise hit blog_posts_slug_key.
// Auto-dedupe by appending -2, -3, ... instead of surfacing a raw DB error.
async function uniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug;
  let suffix = 2;
  for (;;) {
    let query = supabaseAdmin.from('blog_posts').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

router.get('/posts', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data });
});

router.post('/posts', requireAuth, async (req, res) => {
  const body = { ...req.body };
  if (body.slug) body.slug = await uniqueSlug(body.slug);
  if (body.status === 'published' && !body.published_at) body.published_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from('blog_posts').insert(body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ post: data });
});

router.put('/posts/:id', requireAuth, async (req, res) => {
  const body = { ...req.body, updated_at: new Date().toISOString() };
  if (body.slug) body.slug = await uniqueSlug(body.slug, req.params.id);
  if (body.status === 'published' && !body.published_at) body.published_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .update(body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ post: data });
});

router.delete('/posts/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('blog_posts').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

// --- FAQs ---

router.get('/faqs', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ faqs: data });
});

router.post('/faqs', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('faqs').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ faq: data });
});

router.put('/faqs/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('faqs')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ faq: data });
});

router.delete('/faqs/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('faqs').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
