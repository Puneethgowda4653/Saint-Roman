/**
 * Ellora — Products page: dynamic hero + coupon capture
 *
 * 1. Reads ?category=<slug> → updates hero title + breadcrumb
 * 2. Reads ?coupon=<code>  → saves to sessionStorage so checkout can auto-apply it
 *    and shows a small notification strip below the header
 */

(function () {
    var API_BASE = 'http://localhost:4000/api/public';
    var params = new URLSearchParams(window.location.search);
    var categorySlug = params.get('category');
    var couponCode = params.get('coupon');

    // ── Hero title + breadcrumb ──────────────────────────────────────────
    function updateHero(name) {
        var heroTitle = document.querySelector('.page-header-box h1');
        if (heroTitle) {
            heroTitle.className = '';
            heroTitle.removeAttribute('data-cursor');
            heroTitle.innerHTML = name;
        }
        var breadcrumbActive = document.querySelector('.page-header-box .breadcrumb-item.active');
        if (breadcrumbActive) {
            breadcrumbActive.textContent = name;
        }
    }

    function applyUpdate(name) {
        updateHero(name);
        setTimeout(function () { updateHero(name); }, 100);
        setTimeout(function () { updateHero(name); }, 500);
    }

    if (!categorySlug) {
        applyUpdate('All Products');
    } else {
        fetch(API_BASE + '/categories')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var categories = data.categories || [];
                var match = categories.filter(function (c) { return c.slug === categorySlug; })[0];
                if (match) {
                    applyUpdate(match.name);
                } else {
                    var readable = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
                    applyUpdate(readable);
                }
            })
            .catch(function () {
                var readable = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
                applyUpdate(readable);
            });
    }

    // ── Coupon capture ───────────────────────────────────────────────────
    if (couponCode) {
        // Save to sessionStorage so checkout.html can pick it up
        sessionStorage.setItem('ellora_offer_coupon', couponCode);

        // Show a notification strip below the page header
        var pageHeader = document.querySelector('.page-header');
        if (pageHeader) {
            var strip = document.createElement('div');
            strip.style.cssText = 'background:#000;color:#fff;text-align:center;padding:12px 16px;font-size:14px;letter-spacing:0.5px;';
            strip.innerHTML = '🎉 Coupon <strong>' + couponCode + '</strong> will be applied at checkout — <a href="cart.html" style="color:#fff;text-decoration:underline;font-weight:600;">Go to Cart</a>';
            pageHeader.insertAdjacentElement('afterend', strip);
        }
    }
})();