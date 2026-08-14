// Declarative WhatsApp menu tree — a data table of steps, not a switch-statement, so the
// conversation logic stays reviewable without touching webhook plumbing (server/routes/whatsapp.js
// just drives whichever step is current). Mirrors the NEXT_STATUSES-as-a-table approach already
// used for order status transitions in server/routes/orders.js.
//
// Content (menu labels, static policy copy) is taken from the original flow doc
// (WhatsApp_AutoReply_Flow.docx). Every branch that doc left as "we'll check and update you" is
// wired to a real query here instead (Track Order, Refund Status, product browsing); branches with
// no real backing data anywhere in this project (Gift Cards, EMI) say so honestly rather than
// inventing content, same approach already used for the storefront's Reviews tab.

import { supabaseAdmin } from '../config/supabase.js';
import { createTicketFromConversation } from './supportTickets.js';

function formatOrderStatus(status) {
  return status.replace(/_/g, ' ');
}

// ─── Step-builder helpers ───────────────────────────────────────────────

// A menu step shows a list/buttons message; picking an option jumps straight to that option's
// `next` step by id — nothing to mis-type, unlike the doc's "reply with the number" original.
// `options` can be a plain array or an async (ctx) => array, for menus built from live data
// (categories, coupons, search results).
function menu(id, { kind, header, bodyText, buttonLabel, options }) {
  async function resolveOptions(ctx) {
    return typeof options === 'function' ? await options(ctx) : options;
  }
  return {
    id,
    async render(ctx) {
      const opts = await resolveOptions(ctx);
      const body = typeof bodyText === 'function' ? await bodyText(ctx) : bodyText;
      if (opts.length === 0) {
        return { kind: 'text', bodyText: `${body}\n\n(Nothing available right now — reply anything to go back to the main menu.)` };
      }
      return {
        kind,
        headerText: header,
        bodyText: body,
        buttonLabel,
        rows: opts.map((o) => ({ id: o.id, title: o.title, description: o.description })),
      };
    },
    async onInput(input, ctx) {
      const opts = await resolveOptions(ctx);
      const match = opts.find((o) => o.id === input);
      if (!match) return { nextStep: id, reprompt: true };
      return { nextStep: match.next, contextPatch: match.contextPatch };
    },
  };
}

// A pure info leaf — shows static text, any reply just returns to the main menu.
function info(id, { body, next = 'welcome' }) {
  return {
    id,
    async render() {
      return { kind: 'text', bodyText: body };
    },
    async onInput() {
      return { nextStep: next };
    },
  };
}

// A capture step prompts for free text (or shows a computed message) and hands the raw reply to a
// resolver that does the real work (DB lookup, ticket creation) and decides what happens next.
function capture(id, { prompt, resolve }) {
  return {
    id,
    async render(ctx) {
      const body = typeof prompt === 'function' ? await prompt(ctx) : prompt;
      return { kind: 'text', bodyText: body };
    },
    onInput: resolve, // async (input, ctx, conversation) => { reply?, nextStep, contextPatch? }
  };
}

// ─── Resolvers for the "live data" branches ─────────────────────────────

async function resolveTrackOrder(input) {
  const term = input.trim();
  let { data } = await supabaseAdmin
    .from('orders')
    .select('order_number, status, tracking_number, courier, shipped_at, delivered_at')
    .eq('order_number', term)
    .maybeSingle();

  if (!data) {
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 8) {
      const res = await supabaseAdmin
        .from('orders')
        .select('order_number, status, tracking_number, courier, shipped_at, delivered_at')
        .ilike('customer_phone', `%${digits.slice(-10)}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = res.data;
    }
  }

  if (!data) {
    return {
      reply: { kind: 'text', bodyText: `We couldn't find an order matching "${term}". Please double-check your Order ID or the mobile number used to place the order.` },
      nextStep: 'post_action',
    };
  }

  const lines = [`📦 *Order ${data.order_number}*`, `Status: ${formatOrderStatus(data.status)}`];
  if (data.tracking_number) lines.push(`Tracking: ${data.tracking_number}${data.courier ? ` (${data.courier})` : ''}`);
  if (data.delivered_at) lines.push(`Delivered: ${new Date(data.delivered_at).toLocaleDateString('en-IN')}`);
  else if (data.shipped_at) lines.push(`Shipped: ${new Date(data.shipped_at).toLocaleDateString('en-IN')}`);

  return { reply: { kind: 'text', bodyText: lines.join('\n') }, nextStep: 'post_action' };
}

async function resolveRefundStatus(input) {
  const term = input.trim();
  const notFound = {
    reply: { kind: 'text', bodyText: `We couldn't find a return/refund on file for order "${term}". If you haven't started a return yet, reply 5 from the main menu for Returns & Exchanges.` },
    nextStep: 'post_action',
  };

  // Supabase can't filter on a joined table's column directly without an !inner join — same
  // constraint noted in public.js's ?category= handling — so resolve order_number -> id first,
  // then filter `returns` directly on the real `order_id` column.
  const { data: order } = await supabaseAdmin.from('orders').select('id, order_number').eq('order_number', term).maybeSingle();
  if (!order) return notFound;

  const { data } = await supabaseAdmin
    .from('returns')
    .select('status, refund_amount')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return notFound;

  const lines = [`💳 *Refund for ${order.order_number}*`, `Status: ${formatOrderStatus(data.status)}`, `Amount: ₹${data.refund_amount}`];
  return { reply: { kind: 'text', bodyText: lines.join('\n') }, nextStep: 'post_action' };
}

async function resolveProductSearch(input) {
  const term = input.trim();
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, base_price')
    .eq('status', 'active')
    .ilike('name', `%${term}%`)
    .limit(5);

  if (!data || data.length === 0) {
    return { reply: { kind: 'text', bodyText: `No products matched "${term}". Try a different search term, or reply 1 from the main menu to browse by category.` }, nextStep: 'post_action' };
  }

  return {
    nextStep: 'product_search_results',
    contextPatch: { search_results: data.map((p) => ({ id: p.id, name: p.name, base_price: p.base_price })) },
  };
}

// Not a real recommendation engine (no sizing data anywhere in this schema) — collected details go
// to a human via a ticket, same as the doc's own "our team will recommend the best size."
async function resolveSizeHelp(input, ctx, conversation) {
  await createTicketFromConversation({
    conversation,
    subject: 'WhatsApp: Size recommendation request',
    message: `Customer requested a size recommendation.\nDetails provided: ${input.trim()}`,
    priority: 'low',
  });
  return {
    reply: { kind: 'text', bodyText: "Thanks! We've passed your details to our team — they'll reply with a size recommendation shortly." },
    nextStep: 'post_action',
  };
}

function issueTicketResolver(subjectPrefix, priority = 'medium') {
  return async (input, ctx, conversation) => {
    await createTicketFromConversation({
      conversation,
      subject: subjectPrefix,
      message: input.trim(),
      priority,
    });
    return {
      reply: { kind: 'text', bodyText: 'Thank you — a ticket has been created and our support team will get back to you shortly.' },
      nextStep: 'post_action',
    };
  };
}

async function resolveSpeakToAgent(input, ctx, conversation) {
  await createTicketFromConversation({
    conversation,
    subject: 'WhatsApp: Speak to Customer Care',
    message: input.trim(),
    priority: 'high',
    handOff: true,
  });
  return {
    reply: { kind: 'text', bodyText: '👩‍💼 Thanks — a Saint Roman Customer Care Executive will join this conversation shortly. Thank you for your patience.' },
    nextStep: 'post_action',
  };
}

// ─── The step map ────────────────────────────────────────────────────────

export const STEPS = {
  welcome: menu('welcome', {
    kind: 'list',
    header: 'Saint Roman',
    bodyText:
      "👋 Welcome to Saint Roman!\nThank you for contacting us. We're delighted to assist you.\n\nPlease choose the option that best matches your inquiry.\n\nBusiness Hours: Monday – Saturday, 9:00 AM – 6:00 PM. We usually respond within a few minutes during business hours.",
    buttonLabel: 'Menu',
    options: [
      { id: 'shop_products', title: '1. Shop Products', next: 'shop_products' },
      { id: 'product_info', title: '2. Product Information', next: 'product_info' },
      { id: 'size_guide', title: '3. Size Guide', next: 'size_guide' },
      { id: 'track_order', title: '4. Track My Order', next: 'track_order' },
      { id: 'returns_exchanges', title: '5. Returns & Exchanges', next: 'returns_exchanges' },
      { id: 'refund_status', title: '6. Refund Status', next: 'refund_status' },
      { id: 'payments_offers', title: '7. Payment & Offers', next: 'payments_offers' },
      { id: 'product_care', title: '8. Product Care', next: 'product_care' },
      { id: 'report_issue', title: '9. Report an Issue', next: 'report_issue' },
      { id: 'speak_to_agent', title: '10. Speak to Customer Care', next: 'speak_to_agent_capture' },
    ],
  }),

  // A generic "what next" step shown after any lookup/ticket-creation reply.
  post_action: menu('post_action', {
    kind: 'buttons',
    bodyText: 'Is there anything else I can help with?',
    options: [
      { id: 'main_menu', title: '⬅️ Main Menu', next: 'welcome' },
      { id: 'speak_to_agent', title: '👩‍💼 Speak to Executive', next: 'speak_to_agent_capture' },
    ],
  }),

  // 1. Shop Products — real top-level categories, not the doc's static 5 labels.
  shop_products: menu('shop_products', {
    kind: 'list',
    header: '🛍️ Shop Products',
    bodyText: 'Please choose a category.',
    buttonLabel: 'Categories',
    options: async () => {
      const { data } = await supabaseAdmin.from('categories').select('id, name').is('parent_id', null).order('name').limit(9);
      const rows = (data || []).map((c) => ({ id: `cat_${c.id}`, title: c.name, next: 'category_products', contextPatch: { category_id: c.id, category_name: c.name } }));
      rows.push({ id: 'back_welcome', title: '⬅️ Back to Main Menu', next: 'welcome' });
      return rows;
    },
  }),

  category_products: menu('category_products', {
    kind: 'list',
    header: (ctx) => ctx.category_name || 'Products',
    bodyText: (ctx) => `Products in ${ctx.category_name || 'this category'}:`,
    buttonLabel: 'Products',
    options: async (ctx) => {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id, name, base_price')
        .eq('category_id', ctx.category_id)
        .eq('status', 'active')
        .limit(9);
      const rows = (data || []).map((p) => ({ id: `prod_${p.id}`, title: p.name, description: `₹${p.base_price}`, next: 'product_detail', contextPatch: { product_id: p.id } }));
      rows.push({ id: 'back_shop', title: '⬅️ Back to Categories', next: 'shop_products' });
      return rows;
    },
  }),

  product_detail: {
    id: 'product_detail',
    async render(ctx) {
      const { data: p } = await supabaseAdmin
        .from('products')
        .select('name, base_price, description, category:categories(name)')
        .eq('id', ctx.product_id)
        .maybeSingle();
      if (!p) return { kind: 'text', bodyText: 'Sorry, that product is no longer available.' };
      const bits = [`🛍️ *${p.name}*`, `₹${p.base_price}`];
      if (p.category?.name) bits.push(`Category: ${p.category.name}`);
      if (p.description) bits.push(p.description.slice(0, 300));
      return { kind: 'text', bodyText: bits.join('\n') };
    },
    async onInput() {
      return { nextStep: 'post_action' };
    },
  },

  // 2. Product Information — search by name (the doc's static 4-product list isn't real catalog
  // browsing; letting the customer search covers every product, not just 4 hardcoded ones).
  product_info: capture('product_info', {
    prompt: '📦 Product Information\nWhat product are you looking for? Reply with a product name or keyword.',
    resolve: resolveProductSearch,
  }),
  product_search_results: menu('product_search_results', {
    kind: 'list',
    header: 'Search Results',
    bodyText: 'Here\'s what we found:',
    buttonLabel: 'Results',
    options: (ctx) =>
      (ctx.search_results || []).map((p) => ({ id: `prod_${p.id}`, title: p.name, description: `₹${p.base_price}`, next: 'product_detail', contextPatch: { product_id: p.id } })),
  }),

  // 3. Size Guide — no size-chart data exists anywhere in this project (storefront or schema), so
  // this stays general rather than inventing numbers; "help choosing" hands off to a human like the
  // doc itself says ("our team will recommend the best size").
  size_guide: menu('size_guide', {
    kind: 'buttons',
    bodyText: '📏 Size Guide\nPlease select.',
    options: [
      { id: 'size_men', title: "Men's Size Guide", next: 'size_men_info' },
      { id: 'size_women', title: "Women's Size Guide", next: 'size_women_info' },
      { id: 'size_help', title: 'Help Me Choose', next: 'size_help_capture' },
    ],
  }),
  size_men_info: info('size_men_info', {
    body: "📏 Men's Size Guide\nFor the most accurate fit, check the size chart on each product's page on our website. If you're between sizes or unsure, reply 3 from the main menu and choose \"Help Me Choose.\"",
  }),
  size_women_info: info('size_women_info', {
    body: "📏 Women's Size Guide\nFor the most accurate fit, check the size chart on each product's page on our website. If you're between sizes or unsure, reply 3 from the main menu and choose \"Help Me Choose.\"",
  }),
  size_help_capture: capture('size_help_capture', {
    prompt: 'Please reply with your Waist Size, Height, and Weight (e.g. "30in, 5\'8\", 65kg") and our team will recommend the best size.',
    resolve: resolveSizeHelp,
  }),

  // 4. Track My Order — real lookup against `orders`, not "we'll update you."
  track_order: capture('track_order', {
    prompt: '🚚 Track My Order\nPlease send your Order ID, or your registered mobile number.',
    resolve: resolveTrackOrder,
  }),

  // 5. Returns & Exchanges — policy text stays static (no policy-content table); the three
  // "something's wrong with what I got" branches create a real ticket instead of dead-ending.
  returns_exchanges: menu('returns_exchanges', {
    kind: 'list',
    header: '🔄 Returns & Exchanges',
    bodyText: 'Please select.',
    buttonLabel: 'Options',
    options: [
      { id: 'return_policy', title: 'Return Policy', next: 'return_policy_info' },
      { id: 'exchange_policy', title: 'Exchange Policy', next: 'exchange_policy_info' },
      { id: 'wrong_size', title: 'Wrong Size Received', next: 'wrong_size_capture' },
      { id: 'wrong_product', title: 'Wrong Product Received', next: 'wrong_product_capture' },
      { id: 'mfg_defect', title: 'Manufacturing Defect', next: 'mfg_defect_capture' },
    ],
  }),
  return_policy_info: info('return_policy_info', {
    body: 'Items can be returned within 7 days of delivery, unused and with original tags. Reply 5 from the main menu once you have your Order ID ready to start a return.',
  }),
  exchange_policy_info: info('exchange_policy_info', {
    body: 'Size/colour exchanges are accepted within 7 days of delivery, subject to stock availability. Reply 5 from the main menu once you have your Order ID ready to start an exchange.',
  }),
  wrong_size_capture: capture('wrong_size_capture', {
    prompt: 'Sorry about that! Please send your Order ID and the product name so we can arrange the correct size.',
    resolve: issueTicketResolver('WhatsApp: Wrong size received', 'high'),
  }),
  wrong_product_capture: capture('wrong_product_capture', {
    prompt: 'Sorry about that! Please send your Order ID and a short description of what you received instead.',
    resolve: issueTicketResolver('WhatsApp: Wrong product received', 'high'),
  }),
  mfg_defect_capture: capture('mfg_defect_capture', {
    prompt: 'Sorry to hear that. Please send your Order ID and describe the defect (attach a photo if you can).',
    resolve: issueTicketResolver('WhatsApp: Manufacturing defect', 'high'),
  }),

  // 6. Refund Status — real lookup against `returns`, not "we'll check and update you."
  refund_status: capture('refund_status', {
    prompt: '💳 Refund Status\nPlease send your Order ID.',
    resolve: resolveRefundStatus,
  }),

  // 7. Payments & Offers — Current Offers/Discount Coupons pull real active coupons; Gift
  // Cards/EMI say so honestly, since neither exists anywhere in this schema (same "make it honest,
  // not fake" call already made for the storefront's Reviews tab).
  payments_offers: menu('payments_offers', {
    kind: 'list',
    header: '💰 Payments & Offers',
    bodyText: 'Choose an option.',
    buttonLabel: 'Options',
    options: [
      { id: 'payment_methods', title: 'Payment Methods', next: 'payment_methods_info' },
      { id: 'current_offers', title: 'Current Offers', next: 'current_offers_info' },
      { id: 'discount_coupons', title: 'Discount Coupons', next: 'current_offers_info' },
      { id: 'gift_cards', title: 'Gift Cards', next: 'not_available_info' },
      { id: 'emi', title: 'EMI Availability', next: 'not_available_info' },
    ],
  }),
  payment_methods_info: info('payment_methods_info', {
    body: 'We accept Cash on Delivery and all major cards/UPI/net banking at checkout.',
  }),
  current_offers_info: {
    id: 'current_offers_info',
    async render() {
      const { data } = await supabaseAdmin
        .from('coupons')
        .select('code, type, value')
        .eq('is_active', true)
        .limit(5);
      if (!data || data.length === 0) return { kind: 'text', bodyText: 'No active offers right now — check back soon!' };
      const lines = data.map((c) => `🏷️ *${c.code}* — ${c.type === 'percentage' ? `${c.value}% off` : c.type === 'flat' ? `₹${c.value} off` : 'Free shipping'}`);
      return { kind: 'text', bodyText: ['Current offers:', ...lines].join('\n') };
    },
    async onInput() {
      return { nextStep: 'post_action' };
    },
  },
  not_available_info: info('not_available_info', {
    body: "That's not something we offer at the moment.",
  }),

  // 8. Product Care — static, no real data source needed (this is genuinely just fabric-care copy).
  product_care: menu('product_care', {
    kind: 'list',
    header: '🧺 Product Care',
    bodyText: 'Choose an option.',
    buttonLabel: 'Options',
    options: [
      { id: 'washing', title: 'Washing Instructions', next: 'washing_info' },
      { id: 'drying', title: 'Drying Instructions', next: 'drying_info' },
      { id: 'storage', title: 'Storage Tips', next: 'storage_info' },
      { id: 'fabric', title: 'Fabric Care', next: 'fabric_info' },
      { id: 'longevity', title: 'Product Longevity Tips', next: 'longevity_info' },
    ],
  }),
  washing_info: info('washing_info', { body: 'Machine wash cold with like colours, or hand wash for delicate fabrics. Avoid bleach.' }),
  drying_info: info('drying_info', { body: 'Air dry in shade. Avoid direct sunlight and tumble drying to preserve colour and fit.' }),
  storage_info: info('storage_info', { body: 'Store folded in a cool, dry place. Use padded hangers for structured garments.' }),
  fabric_info: info('fabric_info', { body: "Check the care label on each garment — fabric composition varies by product. When in doubt, hand wash cold." }),
  longevity_info: info('longevity_info', { body: 'Turn garments inside out before washing, wash less frequently, and iron on the appropriate heat setting for the fabric.' }),

  // 9. Report an Issue — every branch creates a real ticket.
  report_issue: menu('report_issue', {
    kind: 'list',
    header: '⚠️ Report an Issue',
    bodyText: 'Please select the issue.',
    buttonLabel: 'Issues',
    options: [
      { id: 'damaged', title: 'Damaged Product', next: 'damaged_capture' },
      { id: 'wrong_product2', title: 'Wrong Product', next: 'wrong_product_issue_capture' },
      { id: 'wrong_size2', title: 'Wrong Size', next: 'wrong_size_issue_capture' },
      { id: 'missing_item', title: 'Missing Item', next: 'missing_item_capture' },
      { id: 'delivery_delay', title: 'Delivery Delay', next: 'delivery_delay_capture' },
      { id: 'packaging_damage', title: 'Packaging Damage', next: 'packaging_damage_capture' },
      { id: 'quality_concern', title: 'Quality Concern', next: 'quality_concern_capture' },
    ],
  }),
  damaged_capture: capture('damaged_capture', { prompt: 'Please send your Order ID and describe the damage (attach photos if available).', resolve: issueTicketResolver('WhatsApp: Damaged product', 'high') }),
  wrong_product_issue_capture: capture('wrong_product_issue_capture', { prompt: 'Please send your Order ID and describe what you received.', resolve: issueTicketResolver('WhatsApp: Wrong product', 'high') }),
  wrong_size_issue_capture: capture('wrong_size_issue_capture', { prompt: 'Please send your Order ID and the size received vs. ordered.', resolve: issueTicketResolver('WhatsApp: Wrong size', 'medium') }),
  missing_item_capture: capture('missing_item_capture', { prompt: 'Please send your Order ID and which item is missing.', resolve: issueTicketResolver('WhatsApp: Missing item', 'high') }),
  delivery_delay_capture: capture('delivery_delay_capture', { prompt: 'Please send your Order ID.', resolve: issueTicketResolver('WhatsApp: Delivery delay', 'medium') }),
  packaging_damage_capture: capture('packaging_damage_capture', { prompt: 'Please send your Order ID and attach a photo of the packaging if available.', resolve: issueTicketResolver('WhatsApp: Packaging damage', 'low') }),
  quality_concern_capture: capture('quality_concern_capture', { prompt: 'Please send your Order ID and describe the quality concern.', resolve: issueTicketResolver('WhatsApp: Quality concern', 'medium') }),

  // 10. Speak to Customer Care — always creates a ticket and hands the conversation to a human.
  speak_to_agent_capture: capture('speak_to_agent_capture', {
    prompt: '👩‍💼 Connect with Customer Care\nPlease share your Name, Order ID (if applicable), and a brief description of your concern.',
    resolve: resolveSpeakToAgent,
  }),
};

export const START_STEP = 'welcome';
