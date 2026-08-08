/**
 * Ellora — Mega menu dynamic links
 * Simple, no API calls — rewrites the Shop by collection links immediately.
 */

document.addEventListener('DOMContentLoaded', function () {

    var tagMap = {
        'summer collection': 'summer',
        'winter collection': 'winter',
        'formal wear collection': 'formal',
        'luxury fashion collection': 'luxury',
        'accessories collection': 'accessories',
        'footwear collection': 'footwear'
    };

    // Rewrite every <a> inside .mega-menu-link lists
    var allLinks = document.querySelectorAll('.mega-menu-link a');
    allLinks.forEach(function (link) {
        var text = link.textContent.trim().toLowerCase();
        var tag = tagMap[text];
        if (tag) {
            link.href = 'products.html?tag=' + tag;
        }
    });

    // Fix the preview image cards in the mega menu
    var itemLinks = document.querySelectorAll('.mega-menu-item a');
    itemLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        if (href === 'products.html') {
            // Check if this card has a title we can map
            var item = link.closest('.mega-menu-item');
            if (!item) return;
            var titleEl = item.querySelector('.mega-menu-item-content h2 a') || item.querySelector('.mega-menu-item-content h2');
            if (!titleEl) return;
            var title = titleEl.textContent.trim().toLowerCase();

            if (title === 'new arrivals') {
                link.href = 'products.html?tag=new-arrival';
                if (titleEl.tagName === 'A') titleEl.href = 'products.html?tag=new-arrival';
            } else if (title === 'summer collection') {
                link.href = 'products.html?tag=summer';
                if (titleEl.tagName === 'A') titleEl.href = 'products.html?tag=summer';
            }
        }
    });

    console.log('[Ellora] Mega menu links rewritten');
});