#!/usr/bin/env node
/**
 * build.js — regenerates the Webspaces docs static HTML site from ../\*.md
 *
 * HOW TO RE-RUN:
 *   1. Make sure the dependencies are available. Either:
 *        a) `npm install marked highlight.js` in this folder (docs/html), or
 *        b) point MD2HTML_DEPS at a node_modules folder that has them, e.g.
 *           set MD2HTML_DEPS=C:\Users\gfodo\AppData\Local\Temp\claude\md2html-work\node_modules
 *   2. `node build.js`
 *
 * It reads every .md file in the parent folder (docs/), converts it with
 * marked (GFM enabled: tables, fenced code, etc.), highlights code with
 * highlight.js, rewrites sibling *.md links to *.html, wraps each page in a
 * shared sidebar layout, and writes one .html per .md into this folder
 * (README.md -> index.html) plus a shared style.css.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function req(name) {
  try { return require(name); } catch (_) { /* fall through */ }
  const fallback = process.env.MD2HTML_DEPS ||
    'C:/Users/gfodo/AppData/Local/Temp/claude/md2html-work/node_modules';
  return require(path.join(fallback, name));
}

const { Marked } = req('marked');
const hljs = req('highlight.js');

const DOCS_DIR = path.join(__dirname, '..');
const OUT_DIR = __dirname;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
}

// GitHub-style heading slugs, deduplicated per page.
function makeSlugger() {
  const seen = new Map();
  return (raw) => {
    let slug = raw.toLowerCase().trim()
      .replace(/`/g, '')
      .replace(/[^\wÀ-￿\- ]/g, '')
      .replace(/ /g, '-');
    const n = seen.get(slug) || 0;
    seen.set(slug, n + 1);
    return n === 0 ? slug : `${slug}-${n}`;
  };
}

// Strip lightweight inline markdown (backticks, emphasis) for plain-text uses.
function plainText(md) {
  return md.replace(/`([^`]*)`/g, '$1')
           .replace(/\*\*([^*]*)\*\*/g, '$1')
           .replace(/\*([^*]*)\*/g, '$1')
           .trim();
}

// ---------------------------------------------------------------------------
// Collect chapters
// ---------------------------------------------------------------------------

const mdFiles = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
const chapterFiles = mdFiles.filter((f) => /^\d/.test(f)).sort();
if (!mdFiles.includes('README.md')) throw new Error('README.md not found in ' + DOCS_DIR);
const ordered = ['README.md', ...chapterFiles];

const pages = ordered.map((file) => {
  const src = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
  const m = src.match(/^#\s+(.+)$/m);
  const h1 = m ? plainText(m[1]) : path.basename(file, '.md');
  // Sidebar label: "Overview" for the README; for chapters, the part after
  // "NN — " truncated at the first ":" to keep the nav compact.
  let num = null, label;
  if (file === 'README.md') {
    label = 'Overview';
  } else {
    const cm = h1.match(/^(\d+)\s*—\s*(.+)$/);
    num = cm ? cm[1] : file.slice(0, 2);
    label = (cm ? cm[2] : h1).split(':')[0].trim();
  }
  return {
    file,
    out: file === 'README.md' ? 'index.html' : file.replace(/\.md$/, '.html'),
    src, h1, num, label,
  };
});

// ---------------------------------------------------------------------------
// Markdown -> HTML
// ---------------------------------------------------------------------------

function renderMarkdown(src) {
  const slug = makeSlugger();
  const marked = new Marked({
    gfm: true,
    walkTokens(token) {
      // Rewrite sibling doc links: foo.md / foo.md#frag -> foo.html(#frag).
      // Leave anything with a URL scheme (http:, https:, mailto:, ...) alone.
      if (token.type === 'link' && token.href &&
          !/^[a-z][a-z0-9+.-]*:/i.test(token.href) &&
          /\.md(#|$)/i.test(token.href)) {
        token.href = token.href.replace(/\.md(#|$)/i, '.html$1');
      }
    },
    renderer: {
      heading(token) {
        const id = slug(token.text);
        const inner = this.parser.parseInline(token.tokens);
        return `<h${token.depth} id="${id}">${inner}</h${token.depth}>\n`;
      },
      code(token) {
        const lang = (token.lang || '').trim().split(/\s+/)[0].toLowerCase();
        let body;
        if (lang && hljs.getLanguage(lang)) {
          body = hljs.highlight(token.text, { language: lang }).value;
        } else {
          body = escapeHtml(token.text);
        }
        const cls = lang ? ` class="hljs language-${escapeHtml(lang)}"` : ' class="hljs"';
        return `<pre><code${cls}>${body}\n</code></pre>\n`;
      },
    },
  });
  let html = marked.parse(src);
  // Wrap tables so wide ones scroll horizontally instead of breaking layout.
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>')
             .replace(/<\/table>/g, '</table></div>');
  return html;
}

// ---------------------------------------------------------------------------
// Page layout
// ---------------------------------------------------------------------------

function sidebar(currentOut) {
  const items = pages.map((p) => {
    const cur = p.out === currentOut;
    const numHtml = p.num ? `<span class="ch-num">${p.num}</span>` : '';
    return `      <li${cur ? ' class="current"' : ''}><a href="${p.out}"${cur ? ' aria-current="page"' : ''}>${numHtml}${escapeHtml(p.label)}</a></li>`;
  }).join('\n');
  return `  <nav class="sidebar">
    <a class="site-title" href="index.html">Webspaces<span> Docs</span></a>
    <ul class="chapters">
${items}
    </ul>
  </nav>`;
}

function prevNext(idx) {
  const prev = pages[idx - 1];
  const next = pages[idx + 1];
  if (!prev && !next) return '';
  const a = (p, cls, arrow) => p
    ? `<a class="${cls}" href="${p.out}"><span class="pn-dir">${arrow}</span><span class="pn-title">${escapeHtml(p.h1)}</span></a>`
    : '<span></span>';
  return `\n    <nav class="prev-next">\n      ${a(prev, 'pn-prev', '← Previous')}\n      ${a(next, 'pn-next', 'Next →')}\n    </nav>`;
}

function layout(page, idx, bodyHtml) {
  const title = escapeHtml(page.h1) + ' — Webspaces Docs';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="layout">
${sidebar(page.out)}
  <main class="content">
${bodyHtml}${prevNext(idx)}
  </main>
</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Shared stylesheet
// ---------------------------------------------------------------------------

const CSS = `/* Generated by build.js — shared stylesheet for the Webspaces docs site. */
:root {
  --bg: #ffffff;
  --bg-side: #f6f7f9;
  --fg: #1c2430;
  --fg-muted: #5c6773;
  --link: #0b63c4;
  --link-hover: #084b96;
  --border: #dde2e8;
  --code-bg: #f2f4f7;
  --pre-bg: #f6f8fa;
  --pre-fg: #24292e;
  --quote-bar: #c4ccd6;
  --current-bg: #e3ecf7;
  --current-fg: #0b4f9e;
  --th-bg: #eef1f5;
  --row-alt: #fafbfc;
  /* code token colors (light) */
  --tok-kw: #cf222e;
  --tok-str: #0a3069;
  --tok-com: #6e7781;
  --tok-num: #0550ae;
  --tok-fn: #8250df;
  --tok-attr: #116329;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14181d;
    --bg-side: #1a1f26;
    --fg: #d7dde4;
    --fg-muted: #8b96a3;
    --link: #6cb1ff;
    --link-hover: #9dcaff;
    --border: #2b333d;
    --code-bg: #232a33;
    --pre-bg: #1c222a;
    --pre-fg: #d7dde4;
    --quote-bar: #3d4854;
    --current-bg: #24354a;
    --current-fg: #9dcaff;
    --th-bg: #212831;
    --row-alt: #181d23;
    --tok-kw: #ff7b72;
    --tok-str: #a5d6ff;
    --tok-com: #8b949e;
    --tok-num: #79c0ff;
    --tok-fn: #d2a8ff;
    --tok-attr: #7ee787;
  }
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.65;
  font-size: 16px;
}

.layout { display: flex; min-height: 100vh; }

/* ----- sidebar ----- */
.sidebar {
  flex: 0 0 17.5rem;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  padding: 1.25rem 0.75rem 2rem;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.site-title {
  display: block;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--fg);
  text-decoration: none;
  padding: 0.25rem 0.75rem 0.9rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}
.site-title span { color: var(--fg-muted); font-weight: 500; }
.chapters { list-style: none; margin: 0; padding: 0; }
.chapters li { margin: 0.1rem 0; }
.chapters a {
  display: block;
  padding: 0.28rem 0.75rem;
  border-radius: 6px;
  color: var(--fg-muted);
  text-decoration: none;
  font-size: 0.85rem;
  line-height: 1.35;
}
.chapters a:hover { color: var(--fg); background: var(--code-bg); }
.chapters li.current a {
  background: var(--current-bg);
  color: var(--current-fg);
  font-weight: 600;
}
.ch-num {
  display: inline-block;
  min-width: 1.7rem;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
}
.chapters li.current .ch-num { color: var(--current-fg); }

/* ----- main column ----- */
.content {
  flex: 1;
  min-width: 0;
  padding: 2.5rem 2rem 4rem;
}
.content > * { max-width: 46rem; }
.content > .table-wrap, .content > pre { max-width: 52rem; }

h1, h2, h3, h4 { line-height: 1.3; scroll-margin-top: 1rem; }
h1 { font-size: 1.9rem; margin: 0 0 1rem; }
h2 { font-size: 1.4rem; margin-top: 2.2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
h3 { font-size: 1.15rem; margin-top: 1.8rem; }
h4 { font-size: 1rem; margin-top: 1.5rem; }

a { color: var(--link); text-decoration: none; }
a:hover { color: var(--link-hover); text-decoration: underline; }

p, ul, ol { margin: 0.8rem 0; }
li { margin: 0.25rem 0; }
li > ul, li > ol { margin: 0.25rem 0; }
hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

blockquote {
  margin: 1rem 0;
  padding: 0.1rem 1rem;
  border-left: 4px solid var(--quote-bar);
  color: var(--fg-muted);
  background: var(--bg-side);
  border-radius: 0 6px 6px 0;
}

/* ----- code ----- */
code {
  font-family: ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, Menlo, monospace;
  font-size: 0.86em;
  background: var(--code-bg);
  padding: 0.12em 0.35em;
  border-radius: 4px;
}
pre {
  background: var(--pre-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.9rem 1.1rem;
  overflow-x: auto;
  line-height: 1.5;
  margin: 1rem 0;
}
pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: 0.83rem;
  color: var(--pre-fg);
}

/* highlight.js token colors */
.hljs-keyword, .hljs-selector-tag, .hljs-meta, .hljs-doctag { color: var(--tok-kw); }
.hljs-string, .hljs-regexp, .hljs-template-string { color: var(--tok-str); }
.hljs-comment, .hljs-quote { color: var(--tok-com); font-style: italic; }
.hljs-number, .hljs-literal, .hljs-built_in, .hljs-symbol { color: var(--tok-num); }
.hljs-title, .hljs-function .hljs-title, .hljs-section, .hljs-name { color: var(--tok-fn); }
.hljs-attr, .hljs-attribute, .hljs-variable, .hljs-params, .hljs-selector-class { color: var(--tok-attr); }

/* ----- tables ----- */
.table-wrap { overflow-x: auto; margin: 1rem 0; }
table {
  border-collapse: collapse;
  font-size: 0.88rem;
  line-height: 1.5;
}
th, td {
  border: 1px solid var(--border);
  padding: 0.45rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
th { background: var(--th-bg); font-weight: 600; }
tbody tr:nth-child(even) { background: var(--row-alt); }
td code, th code { white-space: nowrap; }

/* ----- prev/next footer nav ----- */
.prev-next {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}
.prev-next a {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  max-width: 48%;
  font-size: 0.9rem;
}
.prev-next .pn-next { text-align: right; margin-left: auto; }
.pn-dir { font-size: 0.75rem; color: var(--fg-muted); }

/* ----- small screens: sidebar becomes a top nav ----- */
@media (max-width: 900px) {
  .layout { display: block; }
  .sidebar {
    position: static;
    height: auto;
    max-height: 14rem;
    overflow-y: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 0.75rem;
  }
  .content { padding: 1.5rem 1rem 3rem; }
}
`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'style.css'), CSS);

pages.forEach((page, idx) => {
  const body = renderMarkdown(page.src);
  fs.writeFileSync(path.join(OUT_DIR, page.out), layout(page, idx, body));
  console.log(`${page.file} -> ${page.out}`);
});
console.log(`\nDone: ${pages.length} pages + style.css in ${OUT_DIR}`);
