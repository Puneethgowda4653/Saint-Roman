/**
 * Ellora — Homepage dynamic sections
 *
 * 1. "Our Best Offers" — fetches banners with placement=homepage_offer
 *    and replaces the static cards. Each card links to the right category
 *    AND includes a coupon code in the URL.
 *
 * 2. "New Arrivals" — rewrites each card's links to products.html?category=<slug>
 */

(function () {
    var API_BASE = 'http://localhost:4000/api/public';

    // ── 1. Homepage Offer Cards ──────────────────────────────────────────
    function loadOfferBanners() {
        var container = document.querySelector('.best-offer-item-list');
        if (!container) return;

        fetch(API_BASE + '/banners?placement=homepage_offer')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var banners = data.banners || [];
                if (banners.length === 0) return; // keep static fallback

                container.innerHTML = '';

                banners.forEach(function (banner, index) {
                    var linkUrl = banner.link_url || 'products.html';
                    var imageUrl = banner.image_url || 'images/best-offer-item-image-' + (index + 1) + '.jpg';
                    var badgeText = banner.badge_text || '';
                    var title = banner.title || '';
                    var subtitle = banner.subtitle || '';

                    var card = document.createElement('div');
                    card.className = 'best-offer-item wow fadeInUp';
                    if (index > 0) {
                        card.setAttribute('data-wow-delay', (index * 0.2) + 's');
                    }

                    card.innerHTML =
                        '<div class="best-offer-item-image">' +
                        '<a href="' + linkUrl + '" data-cursor-text="View">' +
                        '<figure class="image-anime">' +
                        '<img src="' + imageUrl + '" alt="">' +
                        '</figure>' +
                        '</a>' +
                        '</div>' +
                        '<div class="best-offer-item-content-box">' +
                        '<div class="best-offer-item-content">' +
                        (badgeText ? '<span>' + badgeText + '</span>' : '') +
                        '<h3>' + title + '</h3>' +
                        (subtitle ? '<p>' + subtitle + '</p>' : '') +
                        '</div>' +
                        '<div class="best-offer-item-button">' +
                        '<a href="' + linkUrl + '" class="btn-default">Get Offer</a>' +
                        '</div>' +
                        '</div>';

                    container.appendChild(card);
                });
            })
            .catch(function () {
                // keep static fallback
            });
    }

    // ── 2. New Arrivals → category links ─────────────────────────────────
    var newArrivalCategoryMap = {
        'chic aura midi dress collection': "women's fashion",
        'luxe leather handbag premium edition': 'accessories',
        'elegant gold jewellery accessories': 'accessories',
        'luxury beauty and care essentials': 'beauty & care'
    };

    function fixNewArrivalLinks() {
        var items = document.querySelectorAll('.new-arrival-item');
        if (!items.length) return;

        fetch(API_BASE + '/categories')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var categories = data.categories || [];

                items.forEach(function (item) {
                    var titleEl = item.querySelector('.new-arrival-item-content h3 a');
                    if (!titleEl) return;

                    var cardName = titleEl.textContent.trim().toLowerCase();
                    var targetCategoryName = newArrivalCategoryMap[cardName];
                    if (!targetCategoryName) return;

                    var match = categories.filter(function (c) {
                        return c.name.trim().toLowerCase() === targetCategoryName;
                    })[0];

                    if (!match) return;

                    var url = 'products.html?category=' + encodeURIComponent(match.slug);
                    item.querySelectorAll('a').forEach(function (a) {
                        a.setAttribute('href', url);
                    });
                });
            })
            .catch(function () {
                // keep fallback links
            });
    }

    loadOfferBanners();
    fixNewArrivalLinks();
})();