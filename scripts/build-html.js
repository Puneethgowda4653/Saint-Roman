/**
 * build-html.js
 *
 * Reads every .html file under SRC_DIR, and for each one:
 *   1. Pulls any inline <script>...</script> blocks out into their own
 *      external .js files (skips scripts that already have a src=,
 *      and skips scripts with a type like "application/ld+json").
 *   2. Minifies each extracted .js file with terser.
 *   3. Minifies the remaining HTML (collapses whitespace, strips comments,
 *      minifies inline CSS/attributes) with html-minifier-terser.
 *   4. Copies every non-HTML file (css/js/images/fonts/etc.) across untouched.
 *
 * SOURCE FILES ARE NEVER MODIFIED. Everything is written to OUT_DIR.
 * Functionality is identical — only formatting/whitespace/comments change.
 *
 * Usage:  node scripts/build-html.js
 */

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const { minify: minifyHtml } = require('html-minifier-terser');
const { minify: minifyJs } = require('terser');

const SRC_DIR = path.join(__dirname, '..', 'html');
const OUT_DIR = path.join(__dirname, '..', 'dist');

const HTML_MINIFY_OPTS = {
    collapseWhitespace: true,
    conservativeCollapse: false,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: false, // we minify extracted scripts ourselves, more control
    keepClosingSlash: true,
    useShortDoctype: true,
};

async function ensureDir(filePath) {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}

async function copyStaticAssets() {
    const files = await fg(['**/*', '!**/*.html'], { cwd: SRC_DIR, dot: false });
    for (const relPath of files) {
        const src = path.join(SRC_DIR, relPath);
        const dest = path.join(OUT_DIR, relPath);
        await ensureDir(dest);
        await fs.promises.copyFile(src, dest);
    }
    console.log(`Copied ${files.length} static asset(s) untouched.`);
}

// Extracts inline <script> blocks (no src attr, no non-JS type) from html.
// Returns { html: htmlWithPlaceholders, scripts: [{ filename, code }] }
function extractInlineScripts(html, baseName) {
    const scripts = [];
    let counter = 0;

    const scriptTagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

    const newHtml = html.replace(scriptTagRegex, (match, attrs, code) => {
        const hasSrc = /\bsrc\s*=/i.test(attrs);
        const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'text/javascript';
        const isJsType = type === 'text/javascript' || type === 'application/javascript' || type === 'module' || type === '';

        // Leave external scripts and non-JS scripts (json-ld, templates, etc.) untouched.
        if (hasSrc || !isJsType || !code.trim()) {
            return match;
        }

        counter += 1;
        const filename = `${baseName}.inline-${counter}.js`;
        scripts.push({ filename, code });

        // module scripts need type="module" preserved on the new external tag
        const moduleAttr = type === 'module' ? ' type="module"' : '';
        return `<script src="js/generated/${filename}"${moduleAttr}></script>`;
    });

    return { html: newHtml, scripts };
}

async function buildHtmlFile(srcPath) {
    const relPath = path.relative(SRC_DIR, srcPath);
    const baseName = path.basename(srcPath, '.html');
    const rawHtml = await fs.promises.readFile(srcPath, 'utf8');

    const { html: htmlWithPlaceholders, scripts } = extractInlineScripts(rawHtml, baseName);

    // Minify + write each extracted script
    for (const { filename, code } of scripts) {
        let minified;
        try {
            const result = await minifyJs(code, { compress: true, mangle: true });
            minified = result.code || '';
        } catch (err) {
            console.warn(`  ! Could not minify inline script in ${relPath} (${filename}): ${err.message}`);
            console.warn('    Writing unminified as a fallback so functionality is not broken.');
            minified = code;
        }
        const outPath = path.join(OUT_DIR, 'js', 'generated', filename);
        await ensureDir(outPath);
        await fs.promises.writeFile(outPath, minified, 'utf8');
    }

    // Minify the HTML itself
    const minifiedHtml = await minifyHtml(htmlWithPlaceholders, HTML_MINIFY_OPTS);

    const outPath = path.join(OUT_DIR, relPath);
    await ensureDir(outPath);
    await fs.promises.writeFile(outPath, minifiedHtml, 'utf8');

    console.log(`Built ${relPath}  (${scripts.length} inline script${scripts.length === 1 ? '' : 's'} extracted)`);
}

async function main() {
    await fs.promises.rm(OUT_DIR, { recursive: true, force: true });

    const htmlFiles = await fg(['**/*.html'], { cwd: SRC_DIR });
    if (!htmlFiles.length) {
        console.error(`No .html files found under ${SRC_DIR}`);
        process.exit(1);
    }

    for (const relPath of htmlFiles) {
        await buildHtmlFile(path.join(SRC_DIR, relPath));
    }

    await copyStaticAssets();

    console.log(`\nDone. Minified site written to: ${OUT_DIR}`);
    console.log('Serve dist/ instead of html/ — source files in html/ were not touched.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});