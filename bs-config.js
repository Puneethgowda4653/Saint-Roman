// browser-sync config for local dev (npm run dev) — serves html/ with pretty
// URLs via the shared rewrite middleware (scripts/storefront-rewrite-middleware.js).
// See bs-config.dist.js for the equivalent used against the built dist/ folder.
const { createRewriteMiddleware } = require('./scripts/storefront-rewrite-middleware.js');

module.exports = {
    server: {
        baseDir: 'html',
        middleware: createRewriteMiddleware(),
    },
    files: ['html/**/*'],
};
