// Wires html/blog-single.html to a real blog post from the Ellora admin panel
// (server/routes/public.js: GET /api/public/blog-posts/:slug), following the same
// dynamic-page pattern as mega-menu-dynamic.js / homepage-dynamic-sections.js.
(function () {
    var API_BASE = 'http://localhost:4000/api/public';
    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');

    var titleEl = document.getElementById('blog-post-title');
    var dateEl = document.getElementById('blog-post-date');
    var imageEl = document.getElementById('blog-post-image');
    var contentEl = document.getElementById('blog-post-content');

    function formatDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // The admin's Blog Posts "Content" field (admin/src/pages/BlogPostsPage.tsx) is a plain
    // <Textarea> — posts are stored as unstructured plain text, no HTML/Markdown. Dumping that
    // straight into .post-entry as one innerHTML string collapses every blank line and numbered
    // item into a single run-on paragraph, because HTML ignores literal newlines. This rebuilds
    // real <p> paragraphs (split on blank lines) and turns a block of consecutive "1. ..." /
    // "- ..." lines into a proper <ul><li> list, matching the theme's .post-entry markup/CSS.
    // If a post's content already contains real markup (e.g. from a future rich-text editor),
    // it's passed straight through instead of being re-escaped.
    function looksLikeHtml(str) {
        return /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|br|div|span|a)[\s>]/i.test(str);
    }

    function formatPlainTextContent(raw) {
        var blocks = raw.replace(/\r\n/g, '\n').split(/\n\s*\n/);
        return blocks
            .map(function (block) {
                var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                if (!lines.length) return '';

                var isList = lines.length > 1 && lines.every(function (l) { return /^(\d+[.)]|[-*])\s+/.test(l); });
                if (isList) {
                    var items = lines
                        .map(function (l) { return '<li>' + escapeHtml(l.replace(/^(\d+[.)]|[-*])\s+/, '')) + '</li>'; })
                        .join('');
                    return '<ul>' + items + '</ul>';
                }

                return '<p>' + escapeHtml(lines.join(' ')) + '</p>';
            })
            .join('');
    }

    function renderContent(raw) {
        if (!raw) return '<p>No content available.</p>';
        return looksLikeHtml(raw) ? raw : formatPlainTextContent(raw);
    }

    // The theme reveals .text-anime-style-3 headings once, on document.fonts.ready / window
    // 'load' (see js/function.js initHeadingAnimation), by splitting whatever text is already
    // in the element (the static placeholder title) into per-char spans. That split runs before
    // this script's fetch resolves. SplitText.revert() restores the element to the exact markup
    // it captured when THAT split was created — i.e. the placeholder text, not whatever the
    // element currently contains — so revert() must happen BEFORE the real title is written in,
    // never after. (An earlier version here set the real text first and reverted after, which
    // silently discarded the real title and put the placeholder back.)
    function setHeadingText(el, text) {
        if (!el) return;

        if (el.animation) el.animation.progress(1).kill();
        if (el.split) el.split.revert();

        el.textContent = text;

        if (typeof gsap === 'undefined' || typeof SplitText === 'undefined') return;

        el.split = new SplitText(el, { type: 'lines,words,chars', linesClass: 'split-line' });
        gsap.set(el, { perspective: 400 });
        gsap.set(el.split.chars, { opacity: 0, x: '50' });
        el.animation = gsap.to(el.split.chars, {
            scrollTrigger: { trigger: el, start: 'top 90%' },
            x: '0',
            y: '0',
            rotateX: '0',
            opacity: 1,
            duration: 1,
            ease: typeof Back !== 'undefined' ? Back.easeOut : 'back.out(1.7)',
            stagger: 0.02,
        });
    }

    function showNotFound() {
        setHeadingText(titleEl, 'Post not found');
        document.title = 'Post not found - Ellora';
        dateEl.innerHTML = '';
        contentEl.innerHTML = '<p>Sorry, we couldn\'t find that blog post.</p>';
    }

    if (!slug) {
        showNotFound();
        return;
    }

    fetch(API_BASE + '/blog-posts/' + encodeURIComponent(slug))
        .then(function (res) {
            if (!res.ok) throw new Error('not found');
            return res.json();
        })
        .then(function (data) {
            var post = data.post;
            setHeadingText(titleEl, post.title);
            document.title = post.title + ' - Ellora - Fashion & Lifestyle Store eCommerce HTML Template';
            dateEl.innerHTML = '<i class="fa-regular fa-clock"></i> ' + formatDate(post.published_at || post.created_at);
            imageEl.src = post.featured_image_url || 'images/post-1.jpg';
            imageEl.alt = post.title || '';
            contentEl.innerHTML = renderContent(post.content);
        })
        .catch(function () {
            showNotFound();
        });
})();
