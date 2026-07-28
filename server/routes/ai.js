import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateText, isConfigured, getModel } from '../lib/gemini.js';

const router = Router();

// Lets the UI show a friendly "add your key" state instead of failing on every call.
router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: isConfigured(), provider: 'gemini', model: getModel() });
});

router.post('/generate-description', requireAuth, async (req, res) => {
  const { name, brand, category, keywords, tone } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });

  const prompt = `You are an expert e-commerce copywriter for a fashion & lifestyle store.
Write a compelling product description for the following product.

Product name: ${name}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}
${keywords ? `Keywords to weave in: ${keywords}` : ''}
Tone: ${tone || 'premium and engaging'}

Requirements:
- Two short paragraphs, roughly 60-90 words total.
- Sell the benefit and the style, not just a list of features.
- Plain sentences only — no markdown, no headings, no bullet points.`;

  try {
    const description = await generateText(prompt);
    res.json({ description });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/generate-seo', requireAuth, async (req, res) => {
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });

  const prompt = `Generate SEO metadata for an e-commerce fashion product.
Product: ${name}${category ? ` (category: ${category})` : ''}.
Respond with exactly two lines in this format and nothing else:
TITLE: <SEO title, under 60 characters>
META: <meta description, under 155 characters>`;

  try {
    const text = await generateText(prompt);
    const title = (text.match(/TITLE:\s*(.+)/i)?.[1] || '').trim();
    const meta = (text.match(/META:\s*(.+)/i)?.[1] || '').trim();
    res.json({ title, meta_description: meta, raw: text });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
