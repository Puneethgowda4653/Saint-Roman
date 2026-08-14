import { Router } from 'express';
import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import * as wa from '../lib/whatsapp.js';
import { STEPS, START_STEP } from '../lib/whatsappFlow.js';

const router = Router();

// Unauthenticated — Meta calls this directly (webhook), same tier as public.js. Signature
// verification below (not requireAuth) is what actually keeps this endpoint honest.

// ─── GET /webhook — Meta's one-time subscription handshake ──────────────
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ─── POST /webhook — inbound messages ────────────────────────────────────

function verifySignature(req) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const header = req.get('x-hub-signature-256');
  if (!secret || !header || !req.rawBody) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, headerBuf);
}

// Normalizes an inbound Meta message into the plain string the flow engine matches against —
// the tapped option id for interactive replies, or the raw text body for free-text capture steps.
// Returns null for message types the flow doesn't drive (images, audio, documents, ...).
function extractInput(message) {
  if (message.type === 'interactive') {
    const inter = message.interactive;
    if (inter.type === 'list_reply') return inter.list_reply.id;
    if (inter.type === 'button_reply') return inter.button_reply.id;
    return null;
  }
  if (message.type === 'text') return message.text.body;
  return null;
}

async function getOrCreateConversation(phone) {
  const { data: existing } = await supabaseAdmin.from('wa_conversations').select('*').eq('phone', phone).maybeSingle();
  if (existing) return { conversation: existing, isNew: false };

  const { data: created, error } = await supabaseAdmin
    .from('wa_conversations')
    .insert({ phone, current_step: START_STEP })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { conversation: created, isNew: true };
}

async function logMessage(conversationId, direction, messageType, payload) {
  await supabaseAdmin.from('wa_messages').insert({ conversation_id: conversationId, direction, message_type: messageType, payload });
}

// Dispatches a step's rendered message shape ({kind, bodyText, headerText?, buttonLabel?, rows?})
// to the matching whatsapp.js sender, and logs the outbound message for the transcript.
async function sendRendered(conversationId, phone, rendered) {
  if (rendered.kind === 'buttons') {
    await wa.sendButtons(phone, rendered.bodyText, rendered.rows.map((r) => ({ id: r.id, title: r.title })));
    await logMessage(conversationId, 'out', 'interactive', rendered);
    return;
  }
  if (rendered.kind === 'list') {
    await wa.sendList(phone, { headerText: rendered.headerText, bodyText: rendered.bodyText, buttonLabel: rendered.buttonLabel || 'Menu', rows: rendered.rows });
    await logMessage(conversationId, 'out', 'interactive', rendered);
    return;
  }
  await wa.sendText(phone, rendered.bodyText);
  await logMessage(conversationId, 'out', 'text', rendered);
}

async function handleInboundMessage(message) {
  const phone = message.from;
  let { conversation, isNew } = await getOrCreateConversation(phone);

  await logMessage(conversation.id, 'in', message.type, message);
  await supabaseAdmin.from('wa_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  // A brand-new number, or one whose conversation was previously closed, always restarts fresh at
  // the main menu — whatever they typed to say hello isn't itself a menu selection.
  if (isNew || conversation.status === 'closed') {
    await supabaseAdmin.from('wa_conversations').update({ current_step: START_STEP, context: {}, status: 'active' }).eq('id', conversation.id);
    const rendered = await STEPS[START_STEP].render({});
    await sendRendered(conversation.id, phone, rendered);
    return;
  }

  // Handed off to a human via the Support Tickets queue — stop auto-replying, just keep logging
  // so the transcript an agent sees stays current. No automated response.
  if (conversation.status === 'handed_off') {
    return;
  }

  const input = extractInput(message);
  if (input === null) {
    // Unsupported message type mid-flow (image/audio/document) — acknowledge without advancing
    // state; the raw message is still logged above for whoever reads the transcript later.
    await sendRendered(conversation.id, phone, { kind: 'text', bodyText: 'Got it — thanks! Reply with a menu option, or type "menu" to see the options again.' });
    return;
  }

  const step = STEPS[conversation.current_step] || STEPS[START_STEP];
  const context = conversation.context || {};
  const result = await step.onInput(input, context, conversation);

  if (result.reprompt) {
    await sendRendered(conversation.id, phone, { kind: 'text', bodyText: "❓ Sorry, I didn't understand that — please pick one of the options below." });
    const rendered = await step.render(context);
    await sendRendered(conversation.id, phone, rendered);
    return;
  }

  const nextStepId = result.nextStep || START_STEP;
  const newContext = { ...context, ...(result.contextPatch || {}) };

  await supabaseAdmin
    .from('wa_conversations')
    .update({ current_step: nextStepId, context: newContext, updated_at: new Date().toISOString() })
    .eq('id', conversation.id);

  if (result.reply) await sendRendered(conversation.id, phone, result.reply);

  // A ticket-handoff resolver (e.g. Speak to Customer Care) may have just flipped this
  // conversation to handed_off — re-fetch rather than assume, so we don't render a "what next?"
  // menu on top of "a human will join shortly."
  const { data: freshConversation } = await supabaseAdmin.from('wa_conversations').select('status').eq('id', conversation.id).maybeSingle();
  if (freshConversation?.status === 'handed_off') return;

  const nextStep = STEPS[nextStepId] || STEPS[START_STEP];
  const rendered = await nextStep.render(newContext);
  await sendRendered(conversation.id, phone, rendered);
}

router.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) return res.sendStatus(401);

  // Always ack quickly — Meta expects a fast 200 and will retry if it doesn't get one.
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const message of messages) {
          await handleInboundMessage(message).catch((err) => console.error('[whatsapp] failed to handle inbound message', err));
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp] webhook processing error', err);
  }
});

export default router;
