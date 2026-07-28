import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { destroyImage, isConfigured } from '../lib/cloudinary.js';

const router = Router();

// The whole media library — every image ever uploaded, newest first.
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ media: data });
});

// Remove an asset from the library AND from Cloudinary storage.
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: asset } = await supabaseAdmin
    .from('media_assets')
    .select('public_id')
    .eq('id', req.params.id)
    .single();

  if (asset?.public_id && isConfigured()) {
    try {
      await destroyImage(asset.public_id);
    } catch (err) {
      console.error('[media] Cloudinary destroy failed:', err.message);
    }
  }

  const { error } = await supabaseAdmin.from('media_assets').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
