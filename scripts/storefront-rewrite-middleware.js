/**
 * storefront-rewrite-middleware.js
 *
 * Gives the static storefront (html/, or dist/ after build-html.js) real,
 * path-based URLs (e.g. /product/rcb-tshirt, /category/mens-fashion) instead
 * of query strings (product-single.html?slug=rcb-tshirt) — without touching
 * how the pages are actually served (still flat static files).
 *
 * This is a connect/Express-style (req, res, next) middleware, the shape
 * browser-sync's `server.middleware` config option expects. It only rewrites
 * `req.url` — an internal rewrite, not a redirect — so the browser's address
 * bar keeps showing the clean path while the underlying static file server
 * still serves the physical .html file's bytes.
 *
 * The client-side JS that used to read an id/slug via
 * `URLSearchParams(location.search)` reads it from `location.pathname`
 * instead now (see html/js/route-params.js) — window.location itself is
 * untouched by this rewrite, since it only happens server-side.
 */

// Each pattern is matched against the path with the query string already
// stripped. $1 is the captured id/slug, forwarded to the physical page —
// the physical page's own JS re-derives it from the *original* pathname via
// route-params.js, not from anything this middleware passes along.
const SPECIAL_ROUTES = [
    { pattern: /^\/product\/[^/]+\/?$/, target: '/product-single.html' },
    { pattern: /^\/category\/[^/]+\/?$/, target: '/products.html' },
    { pattern: /^\/tag\/[^/]+\/?$/, target: '/products.html' },
    { pattern: /^\/blog\/[^/]+\/?$/, target: '/blog-single.html' },
    { pattern: /^\/account\/orders\/[^/]+\/?$/, target: '/account-order-details.html' },
    { pattern: /^\/order-confirmation\/[^/]+\/?$/, target: '/order-received.html' },
    { pattern: /^\/products\/?$/, target: '/products.html' },
];

function createRewriteMiddleware() {
    return function storefrontRewrite(req, res, next) {
        const queryIndex = req.url.indexOf('?');
        const query = queryIndex === -1 ? '' : req.url.slice(queryIndex);
        let pathname = queryIndex === -1 ? req.url : req.url.slice(0, queryIndex);

        if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        const special = SPECIAL_ROUTES.find(function (route) {
            return route.pattern.test(pathname);
        });

        if (special) {
            req.url = special.target + query;
            return next();
        }

        // Generic fallback: any extensionless path other than root gets its
        // physical .html file — covers every plain page (/about, /cart,
        // /faqs, ...) without a rule per page. Anything with a dot (assets,
        // or a path someone already typed with .html) passes through as-is.
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
        if (pathname !== '/' && pathname !== '' && !hasExtension) {
            req.url = pathname + '.html' + query;
        }

        next();
    };
}

module.exports = { createRewriteMiddleware, SPECIAL_ROUTES };
