import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import loadEssays from "../src/_data/essays.js";
import { renderMarkdown } from "../src/_lib/markdown.js";
import { compareSerials, essayTree, serialParts } from "../src/_lib/essay-tree.js";
import nunjucks from "nunjucks";

const essays = await loadEssays();
const escapeXml = new nunjucks.Environment().getFilter("escape");

test("serial trees sort integer segments and support nested branches", async () => {
  const serials = ["10", "2.10", "2.1.1", "3", "2.1", "2", "1"];
  const fixture = serials.map((serial) => ({ serial, title: `Title ${serial}`, url: `/test/${serial}/` }));
  fixture.find((essay) => essay.serial === "10").title = "Already punctuated.";
  const tree = essayTree(fixture);
  assert.deepEqual(tree.map((node) => node.serial), ["1", "2", "3", "10"]);
  assert.deepEqual(tree[1].children.map((node) => node.serial), ["2.1", "2.10"]);
  assert.equal(tree[1].children[0].children[0].serial, "2.1.1");
  assert.equal(tree[1].children[0].label, "001");
  assert.equal(tree[1].children[1].label, "010");

  const environment = new nunjucks.Environment(null, { autoescape: true });
  environment.addFilter("essayTree", essayTree);
  environment.addFilter("url", (url) => url);
  const template = (await readFile("src/index.njk", "utf8")).replace(/^---[\s\S]*?---/, "");
  const html = environment.renderString(template, { essays: fixture });
  assert.equal((html.match(/<ol class="essay-list">/g) || []).length, 3);
  assert.equal((html.match(/class="branch-connector"/g) || []).length, 2);
  assert.equal((html.match(/class="main-connector"/g) || []).length, 6);
  assert.equal((html.match(/vector-effect="non-scaling-stroke"/g) || []).length, 8);
  for (const serial of serials) assert.ok(html.includes(`aria-label="Essay ${serial}"`));
  assert.ok(html.indexOf("Title 2.1.</h2>") < html.indexOf("Title 2.1.1.</h2>"));
  assert.ok(html.indexOf("Title 2.1.1.</h2>") < html.indexOf("Title 2.10.</h2>"));
  assert.match(html, /<h2>Already punctuated\.<\/h2>/);
  assert.doesNotMatch(html, /Already punctuated\.\./);
  for (const essay of fixture) {
    const title = essay.title.endsWith(".") ? essay.title : `${essay.title}.`;
    assert.ok(html.includes(`<h2>${title}</h2>`));
  }
});

test("tree trunks and branches use matching SVG strokes at circle centerlines", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  const template = await readFile("src/index.njk", "utf8");
  assert.match(css, /\.main-connector, \.branch-connector\s*\{[^}]*stroke: var\(--ink\);[^}]*stroke-width: 1px;/);
  assert.match(css, /\.main-connector\s*\{\s*left: 0;[^}]*width: var\(--node-size\);[^}]*height: calc\(100% - var\(--node-size\)\);/);
  assert.match(css, /\.branch-connector\s*\{\s*left: calc\(var\(--node-size\) \/ 2 - var\(--branch-indent\)\);/);
  assert.match(template, /class="main-connector"[^>]*viewBox="0 0 100 100"[\s\S]*?<path d="M 50 0 V 100"/);
  assert.doesNotMatch(css, /\.essay-list[^{}]*::after\s*\{[^}]*border-left/);
});

test("rejects malformed, duplicate, and orphaned serials", () => {
  for (const serial of [0, -1, "2.0", "2..1", "02", "2.1.", "two"]) {
    assert.throws(() => serialParts(serial), /Invalid essay serial/);
  }
  assert.throws(() => essayTree([{ serial: 1 }, { serial: "1" }]), /unique/);
  assert.throws(() => essayTree([{ serial: "2.1.1" }]), /needs parent essay 2.1/);
});

test("loads saved essays in serial order, ignoring editor artifacts", () => {
  assert.ok(essays.length >= 2);
  assert.ok(essays.some((essay) => essay.slug === "premise"));
  assert.ok(essays.some((essay) => essay.slug === "linguavore"));
  const questions = essays.find((essay) => essay.slug === "three-questions");
  assert.ok(questions);
  assert.equal(String(questions.serial), "3");
  const html = renderMarkdown(questions.body, { slug: questions.slug });
  assert.equal((html.match(/<svg /g) || []).length, (questions.body.match(/^```(?:dot|graphviz)\b/gm) || []).length);
  assert.match(html, /class="footnote-ref"/);
  assert.deepEqual(essays.map((essay) => essay.serial), [...essays].sort(compareSerials).map((essay) => essay.serial));
  essays.forEach((essay, index) => {
    assert.match(essay.slug, /^[a-z0-9-]+$/);
    assert.ok(essay.body.trim());
    assert.equal(essay.previous?.slug, essays[index - 1]?.slug);
    assert.equal(essay.next?.slug, essays[index + 1]?.slug);
  });
});

test("typography follows the Plex Serif, Sans, Mono and Math roles", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  const template = await readFile("src/_includes/base.njk", "utf8");
  assert.match(css, /h1, h2, h3, h4, h5, h6\s*\{[^}]*font-family: var\(--serif\);/);
  assert.match(css, /\.prose\s*\{[^}]*font-family: var\(--sans\);/);
  assert.match(css, /\.essay-navigation a\s*\{[^}]*font-family: var\(--sans\);/);
  assert.match(css, /\.prose code\s*\{[^}]*font-family: var\(--mono\);/);
  assert.match(css, /\.essay-number\s*\{[^}]*font-family: var\(--mono\);/);
  assert.match(css, /clanker-output\s*\{[^}]*font-family: var\(--serif\);/);
  assert.match(css, /\.prose math\s*\{[^}]*font-family: "IBM Plex Math", math;/);
  assert.match(template, /family=IBM\+Plex\+Serif:ital,wght@0,400;0,600;0,700;1,400/);
});

test("Graphviz labels use the loaded IBM Plex Sans regular weight", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  const template = await readFile("src/_includes/base.njk", "utf8");
  assert.match(css, /\.graphviz-diagram text\s*\{[^}]*font-family: var\(--sans\);[^}]*font-weight: 400;/);
  assert.match(template, /family=IBM\+Plex\+Sans:ital,wght@0,400;0,500;/);
});

test("favicon and social preview reuse the space invader watermark shape", async () => {
  const watermark = await readFile("src/assets/space-invader.svg", "utf8");
  const shape = watermark.match(/ d="([^"]+)"/)[1];
  for (const name of ["favicon.svg", "social-preview.svg"]) {
    const svg = await readFile(`src/assets/${name}`, "utf8");
    assert.equal(svg.match(/ d="([^"]+)"/)[1], shape);
  }
  const png = await readFile("src/assets/social-preview.png");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("RSS escapes essay titles and summaries as XML text", async () => {
  const environment = new nunjucks.Environment(null, { autoescape: false });
  environment.addFilter("url", (url) => url);
  const template = (await readFile("src/feed.njk", "utf8")).replace(/^---[\s\S]*?---\n/, "");
  const xml = environment.renderString(template, {
    essays: [{ title: 'Types & <proofs> "quoted"', url: "/essays/test/", excerpt: 'A & B < C; </description><script>not markup</script>' }],
  });
  assert.match(xml, /Types &amp; &lt;proofs&gt; &quot;quoted&quot;/);
  assert.match(xml, /A &amp; B &lt; C; &lt;\/description&gt;&lt;script&gt;not markup&lt;\/script&gt;/);
  assert.doesNotMatch(xml, /<script>/);
});

test("asides share blockquote styling and float only on wide screens", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  assert.match(css, /\.prose blockquote, \.prose aside,[^{]*\{[^}]*border-left: 3px solid var\(--ink\);/);
  assert.match(css, /\.prose aside\s*\{\s*background-color: #ced6d6;/);
  assert.match(css, /\.prose\s*\{[^}]*display: flow-root;/);
  assert.match(css, /@media screen and \(min-width: 1100px\)\s*\{\s*\.prose aside\s*\{\s*float: right;\s*clear: right;\s*width: 20rem;[\s\S]*?margin: calc\(-1 \* var\(--baseline\)\) -7\.5rem var\(--baseline\) 1\.5rem;/);
  assert.match(css, /\.prose aside, clanker-output\s*\{ font-size: inherit; line-height: inherit; \}/);
  assert.match(css, /\.prose math\s*\{ font-family: "IBM Plex Math", math;/);
});

test("prose and special blocks preserve whole-line paragraph spacing", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  assert.match(css, /--baseline: calc\(var\(--prose-size\) \* var\(--prose-leading\)\);/);
  assert.match(css, /\.prose\s*\{[^}]*line-height: var\(--baseline\);/);
  assert.match(css, /\.prose p\s*\{ margin: 0 0 var\(--baseline\); \}/);
  assert.match(css, /\.prose blockquote, \.prose aside,[^{]*\{[^}]*margin: var\(--baseline\) 0; padding: var\(--baseline\) 1\.5rem;/);
  assert.match(css, /\.prose ul, \.prose ol\s*\{ margin-block: 0 var\(--baseline\); \}/);
  assert.match(css, /\.prose pre\s*\{[^}]*padding: calc\(var\(--baseline\) - 1px\)[^}]*line-height: var\(--baseline\);/);
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*?\.prose \{ --prose-size: 1\.125rem; --prose-leading: 1\.8; \}/);
  assert.match(css, /@media print[\s\S]*?\.prose \{ --prose-size: 11pt; \}/);
});

for (const prefix of ["/", "/example-repository/"]) {
  test(`builds navigable pages at ${prefix}`, async () => {
    execFileSync("node", ["node_modules/@11ty/eleventy/cmd.cjs"], {
      env: { ...process.env, PATH_PREFIX: prefix },
      stdio: "pipe",
    });
    const feed = await readFile("_site/feed.xml", "utf8");
    assert.ok(feed.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.match(feed, /<rss version="2.0"/);
    assert.ok(feed.includes(`href="https://aicoprogramming.com${prefix}feed.xml"`));
    assert.equal((feed.match(/<item>/g) || []).length, essays.length);
    for (const essay of essays) {
      const absoluteUrl = `https://aicoprogramming.com${prefix}${essay.url.slice(1)}`;
      assert.ok(feed.includes(`<link>${absoluteUrl}</link>`));
      assert.ok(feed.includes(`<guid isPermaLink="true">${absoluteUrl}</guid>`));
      assert.ok(feed.includes(`<title>${escapeXml(essay.title)}</title>`));
      assert.ok(feed.includes(`<description>${escapeXml(essay.excerpt)}</description>`));
    }
    for (const url of ["/", ...essays.map((essay) => essay.url)]) {
      const html = await readFile(`_site${url}index.html`, "utf8");
      assert.match(html, /<html lang="en">/);
      assert.match(html, /id="main"/);
      const preview = `https://aicoprogramming.com${prefix}assets/social-preview.png`;
      assert.ok(html.includes(`<meta property="og:image" content="${preview}">`));
      assert.ok(html.includes(`<meta name="twitter:image" content="${preview}">`));
      assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
      assert.ok(html.includes(`href="${prefix}assets/favicon.svg"`));
      assert.ok(html.includes(`<link rel="alternate" type="application/rss+xml" title="AI Co-Programming." href="${prefix}feed.xml">`));
      await access("_site/assets/social-preview.png");
      if (url === "/") {
        assert.match(html, /class="essay-pathway"/);
        assert.match(html, /<h1>AI Co-Programming\.<\/h1>/);
        assert.equal((html.match(/<h1>/g) || []).length, 1);
        assert.doesNotMatch(html, /class="intro"|class="lede"|class="reading-time"|class="site-header"|class="site-footer"/);
        assert.match(html, /family=IBM\+Plex\+Mono/);
        assert.match(html, /family=IBM\+Plex\+Sans/);
        assert.match(html, /family=IBM\+Plex\+Serif/);
        for (const essay of essays) {
          const title = essay.title.endsWith(".") ? essay.title : `${essay.title}.`;
          assert.ok(html.includes(`<h2>${title}</h2>`));
          assert.ok(html.includes(`aria-label="Essay ${essay.serial}">${String(essay.serial).split(".").at(-1).padStart(3, "0")}</span>`));
          assert.ok(!html.includes(essay.excerpt));
        }
      }
      if (url === "/essays/three-questions/") {
        const questions = essays.find((essay) => essay.url === url);
        assert.equal((html.match(/<svg /g) || []).length, (questions.body.match(/^```(?:dot|graphviz)\b/gm) || []).length);
        assert.match(html, /font-family="IBM Plex Sans"/);
        assert.match(html, /class="footnotes"/);
        for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
          assert.ok(html.includes(`id="${anchor}"`), `Missing anchor: ${anchor}`);
        }
      }
      if (url === "/essays/proof-or-consequences/") {
        assert.ok(html.includes(`<a href="${prefix}essays/three-questions/">Three Questions</a>`));
        assert.doesNotMatch(html, /\{\{|\[tq\]/);
        const aside = html.match(/<aside>([\s\S]+?)<\/aside>/)?.[1];
        assert.ok(aside);
        assert.match(aside, /<p>/);
        assert.match(aside, /<code>add<\/code>/);
        assert.doesNotMatch(aside, /`/);
      }
      assert.ok(html.includes(`href="${prefix}assets/style.css"`));
      for (const [, target] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        if (/^(https?:|mailto:)/.test(target)) continue;
        assert.ok(target.startsWith(prefix), `Unexpected URL: ${target}`);
        const local = target.slice(prefix.length).split("#")[0];
        await access(`_site/${local}${local.endsWith("/") || !local ? "index.html" : ""}`);
      }
    }
  });
}
