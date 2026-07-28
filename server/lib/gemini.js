// Thin wrapper around Google Gemini's generateContent REST API.
// Key + model come from server/.env (GEMINI_API_KEY, optional GEMINI_MODEL). The key is never
// sent to the frontend — all Gemini calls happen server-side through these helpers.

const DEFAULT_MODEL = 'gemini-2.0-flash';

export function getModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in server/.env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Gemini request failed (${res.status})`);
  }

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no usable text');
  return text.trim();
}
