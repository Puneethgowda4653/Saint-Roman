// browser-sync config for local prod-preview (npm run serve:dist) — serves the
// built dist/ folder with the same pretty-URL rewrite rules as bs-config.js.
const { createRewriteMiddleware } = require('./scripts/storefront-rewrite-middleware.js');

module.exports = {
    server: {
        baseDir: 'dist',
        middleware: createRewriteMiddleware(),
    },
    files: ['dist/**/*'],
};
