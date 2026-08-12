// Minimal client-side compare list for the Ellora storefront. No server-side table or endpoint —
// same "state lives in localStorage" approach as html/js/ellora-cart.js, since a compare list has
// the same "before checkout, nothing needs to be durable across devices" shape as the cart.
//
// Only the button on product-single.html reads/writes this for now — there's no compare.html page
// to actually view the list yet. That's a deliberate scope cut for this pass, not an oversight;
// building one is a natural follow-up once there's a real product grid to render it with.
window.ElloraCompare = (function () {
  var KEY = 'ellora_compare';
  var MAX = 4;

  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
  }

  function has(productId) {
    return get().some(function (i) { return i.id === productId; });
  }

  // Adds a product ({ id, slug, name, image, price }) to the compare list. Returns
  // { added: true } on success, or { added: false, reason: 'exists' | 'full' } — 'full' means
  // the list is already at MAX and the caller should tell the shopper to remove one first,
  // rather than silently evicting whatever they compared first.
  function add(product) {
    var items = get();
    if (items.some(function (i) { return i.id === product.id; })) {
      return { added: false, reason: 'exists' };
    }
    if (items.length >= MAX) {
      return { added: false, reason: 'full' };
    }
    items.push(product);
    save(items);
    return { added: true };
  }

  function remove(productId) {
    save(get().filter(function (i) { return i.id !== productId; }));
  }

  function clear() {
    save([]);
  }

  return { MAX: MAX, get: get, has: has, add: add, remove: remove, clear: clear };
})();
