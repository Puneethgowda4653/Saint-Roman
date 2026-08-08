import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// List all tags (admin)
router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ tags: data });
});

// Create a new tag (admin)
router.post('/', requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tag name is required' });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const { data, error } = await supabaseAdmin
        .from('tags')
        .insert({ name: name.trim(), slug })
        .select()
        .single();

    if (error) {
        if (error.message.includes('duplicate')) {
            return res.status(400).json({ error: 'Tag already exists' });
        }
        return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ tag: data });
});

// Delete a tag (admin)
router.delete('/:id', requireAuth, async (req, res) => {
    const { error } = await supabaseAdmin.from('tags').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
});

export default router;