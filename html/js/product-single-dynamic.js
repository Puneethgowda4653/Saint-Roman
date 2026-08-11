// Wires html/product-single.html (?slug=...) to a real product from the Ellora admin panel
// (server/routes/public.js: GET /api/public/products/:slug), following the project's convention
// for dynamic pages (mega-menu-dynamic.js, blog-single-dynamic.js, homepage-dynamic-sections.js).
//
// Fixes, each verified against the actual data shape before being written:
//   1. Product image never rendered at all (the sliders were 100% static demo images). The
//      single-product endpoint was also selecting the unused `product_images` gallery table
//      instead of the `image_url` column the admin's image upload actually writes to (see the
//      products.image_url comment in server/routes/public.js). There's one image per product,
//      not a gallery, so it's applied to every slide in both the big slider and the thumbnail
//      strip, matching how the rest of the storefront (products.html, homepage) already do it.
//   2. Price used '$' + toFixed(2); now uses the shared EllroaCurrency.format() (js/currency.js).
//   3. Description/Additional Information/Reviews tabs were the same static template copy on
//      every product. Description comes from products.description (real column). Additional
//      Information comes from products.specifications (jsonb, phase8_product_specifications.sql)
//      — a flexible label/value store filled in per-product via the admin's product form, since
//      no category-agnostic fixed columns for this exist or make sense (a t-shirt's Fit/Neckline
//      don't apply to a watch or a lipstick). Both tabs honestly say so if nothing is set. There
//      is no reviews table anywhere in server/supabase/*.sql, so Reviews honestly shows "No
//      reviews yet" / "Reviews (0)" instead of 50 fake ones.
//   4. Related products reused the existing GET /products?category=<slug> endpoint (same one
//      products.html uses for the main grid) instead of a new endpoint or fabricated data —
//      fetches products in the same category, excludes the current product, and shows however
//      many are actually available (0-4).
(function () {
    var API_BASE = 'http://localhost:4000/api/public';
    var slug = new URLSearchParams(window.location.search).get('slug');
    var currentProduct = null;

    document.getElementById('add-to-cart-btn').addEventListener('click', function (e) {
        e.preventDefault();
        if (!currentProduct) return;

        var variant = currentProduct.product_variants && currentProduct.product_variants[0];
        if (!variant) {
            alert('This product has no purchasable variant yet.');
            return;
        }

        var qty = parseInt(document.getElementById('product-qty').value, 10) || 1;

        EllroaCart.add({
            variantId: variant.id,
            productSlug: currentProduct.slug,
            productName: currentProduct.name,
            variantLabel: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
            price: variant.price,
            quantity: qty,
        });

        window.location.href = 'cart.html';
    });

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Single real image per product (products.image_url) — repeated across every slide in both
    // sliders, matching the "single image_url, not a gallery" data shape. Only overwritten when
    // the product actually has one set; otherwise the template's static placeholder image stays,
    // same fallback convention used in homepage-dynamic-sections.js.
    function renderImages(product) {
        if (!product.image_url) return;
        document.querySelectorAll('.product-single-image-slider img, .product-single-image-item img').forEach(function (img) {
            img.src = product.image_url;
            img.alt = product.name || '';
        });
    }

    function renderDescriptionTab(product) {
        var el = document.getElementById('product-description-tab');
        if (!el) return;
        el.innerHTML = product.description
            ? '<p>' + escapeHtml(product.description) + '</p>'
            : '<p>No description available yet.</p>';
    }

    // products.specifications (jsonb, server/supabase/phase8_product_specifications.sql) — a
    // flexible label/value store filled in per-product from the admin's product edit form
    // (admin/src/pages/ProductsPage.tsx "Additional Information" section), since fixed columns
    // like material/fit/neckline only make sense for apparel and don't fit every category Ellora
    // sells (watches, beauty, accessories, ...). Real data only — no fallback to fabricated rows.
    function renderAdditionalInfo(product) {
        var container = document.getElementById('product-additional-info');
        if (!container) return;

        var specs = product.specifications || {};
        var rows = Object.keys(specs).filter(function (label) {
            return specs[label] !== null && specs[label] !== undefined && specs[label] !== '';
        });

        if (rows.length === 0) {
            container.innerHTML = '<p>No additional information available.</p>';
            return;
        }

        container.innerHTML = '<table>' + rows.map(function (label) {
            return '<tr><td><b>' + escapeHtml(label) + '</b></td><td>' + escapeHtml(specs[label]) + '</td></tr>';
        }).join('') + '</table>';
    }

    // No reviews table exists anywhere in server/supabase/*.sql — nothing to fetch. Honest
    // empty state instead of the 50 fake "Author" reviews the static template shipped with.
    function renderReviews() {
        var tab = document.getElementById('third-tab');
        if (tab) tab.textContent = 'Reviews (0)';
    }

    // Related products: same category as the current product, real data only, reusing the
    // existing GET /products?category=<slug> endpoint (the same one products.html's main grid
    // uses) instead of adding a duplicate catalog query or a new endpoint.
    function loadRelatedProducts(product) {
        var section = document.querySelector('.related-products');
        var cards = document.querySelectorAll('.related-product-items-list .product-item');
        if (!section || !cards.length) return;

        var categorySlug = product.category && product.category.slug;
        if (!categorySlug) {
            section.style.display = 'none';
            return;
        }

        fetch(API_BASE + '/products?category=' + encodeURIComponent(categorySlug) + '&limit=' + (cards.length + 1))
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var related = (data.products || []).filter(function (p) { return p.id !== product.id; }).slice(0, cards.length);

                if (related.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                cards.forEach(function (card, i) {
                    if (i >= related.length) {
                        card.style.display = 'none';
                        return;
                    }
                    var p = related[i];
                    var href = 'product-single.html?slug=' + encodeURIComponent(p.slug);

                    var img = card.querySelector('.product-item-image img');
                    if (img) {
                        img.src = p.image_url || 'images/product-image-1.png';
                        img.alt = p.name || '';
                    }
                    var imgLink = card.querySelector('.product-item-image a');
                    if (imgLink) imgLink.href = href;

                    var title = card.querySelector('.product-item-title a');
                    if (title) {
                        title.textContent = p.name;
                        title.href = href;
                    }

                    var priceEl = card.querySelector('.product-item-price h3');
                    if (priceEl) {
                        var html = EllroaCurrency.format(p.base_price);
                        if (p.compare_at_price && p.compare_at_price > p.base_price) {
                            html += ' <span>' + EllroaCurrency.format(p.compare_at_price) + '</span>';
                        }
                        priceEl.innerHTML = html;
                    }
                });
            })
            .catch(function () {
                section.style.display = 'none';
            });
    }

    if (!slug) return;

    fetch(API_BASE + '/products/' + encodeURIComponent(slug))
        .then(function (res) {
            if (!res.ok) throw new Error('Product not found');
            return res.json();
        })
        .then(function (data) {
            var product = data.product;
            currentProduct = product;

            var price = EllroaCurrency.format(product.base_price);
            var compareAt = product.compare_at_price
                ? '<sub>' + EllroaCurrency.format(product.compare_at_price) + '</sub>'
                : '';

            document.title = product.name + ' - Ellora';
            document.getElementById('product-breadcrumb').textContent = product.name;
            document.getElementById('product-title').textContent = product.name;
            document.getElementById('product-category').textContent = product.category ? product.category.name : '';
            document.getElementById('product-description').textContent = product.description || '';
            document.getElementById('product-price').innerHTML = price + ' ' + compareAt;
            document.getElementById('product-sku').textContent = product.slug;
            document.getElementById('product-categories-detail').textContent = product.category ? product.category.name : 'Uncategorized';

            renderImages(product);
            renderDescriptionTab(product);
            renderAdditionalInfo(product);
            renderReviews();
            loadRelatedProducts(product);
        })
        .catch(function () {
            document.getElementById('product-title').textContent = 'Product not found';
            document.getElementById('product-description').textContent = 'This product could not be found.';
            var relatedSection = document.querySelector('.related-products');
            if (relatedSection) relatedSection.style.display = 'none';
        });
})();
