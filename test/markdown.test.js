import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../src/_lib/markdown.js";

const graph = 'digraph G { rankdir=LR; Presentation [shape=rect]; State [label="Relational\\nDatabase"]; Presentation -> State [label="SQL"]; }';

test("renders footnotes with working reference and return links", () => {
  const html = renderMarkdown("Reference[^1].\n\n[^1]: Footnote text.");
  assert.match(html, /class="footnote-ref"/);
  assert.match(html, /id="fn1"/);
  assert.match(html, /href="#fn1"/);
  assert.match(html, /id="fnref1"/);
  assert.match(html, /href="#fnref1"/);
  assert.match(html, /Footnote text\./);
  assert.doesNotMatch(html, /\[\^1\]/);
});

test("renders DOT and Graphviz fences as themed, accessible inline SVGs", () => {
  const html = renderMarkdown(`\`\`\`dot\n${graph}\n\`\`\`\n\n\`\`\`graphviz Layers\n${graph}\n\`\`\``, { slug: "test" });
  assert.equal((html.match(/<svg /g) || []).length, 2);
  assert.match(html, /role="img" aria-label="Graphviz diagram"/);
  assert.match(html, /aria-label="Layers"/);
  assert.match(html, /font-family="IBM Plex Sans"/);
  assert.match(html, /fill="#f6f9f9"/i);
  assert.match(html, /stroke="#335050"/i);
  assert.match(html, /fill="#113030"/i);
  assert.match(html, />SQL<\/text>/);
  assert.match(html, />Relational<\/text>/);
  assert.match(html, />Database<\/text>/);
  assert.doesNotMatch(html, /<\?xml|<!DOCTYPE|language-dot|language-graphviz/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(ids.some((id) => id.startsWith("diagram-test-1-")));
  assert.ok(ids.some((id) => id.startsWith("diagram-test-2-")));
});

test("fits Plex text to Graphviz layout widths, including long rectangular labels", () => {
  const html = renderMarkdown('```dot\ndigraph { node [shape=rect]; idea [label="We are creating a mobile and web game."]; idea -> api [label="REST"]; api [label="Web & API\\nSecond line"]; }\n```');
  const labels = [...html.matchAll(/<text\b[^>]*>/g)];
  assert.equal(labels.length, 4);
  for (const [tag] of labels) {
    assert.match(tag, /textLength="[\d.]+" lengthAdjust="spacingAndGlyphs"/);
  }
  const node = html.match(/<g[^>]*class="node">([\s\S]*?)<\/g>/)[1];
  const points = node.match(/<polygon[^>]*points="([^"]+)"/)[1].split(" ").map((point) => Number(point.split(",")[0]));
  const width = Number(node.match(/textLength="([^"]+)"/)[1]);
  assert.ok(width > 0);
  assert.ok(width < Math.max(...points) - Math.min(...points), "label must fit inside its rectangle with padding");
});

test("preserves ordinary code fences and trusted HTML", () => {
  const html = renderMarkdown('```js\nconst x = "<svg>";\n```\n\n<dl><dt>Input</dt><dd>SQL</dd></dl>');
  assert.match(html, /class="language-js"/);
  assert.match(html, /&lt;svg&gt;/);
  assert.match(html, /<dl><dt>Input<\/dt><dd>SQL<\/dd><\/dl>/);
});

test("preserves clanker-output elements for block styling", () => {
  const html = renderMarkdown('<clanker-output>Output <em>emphasis</em>.</clanker-output>');
  assert.match(html, /<clanker-output>\s*<p>Output <em>emphasis<\/em>\.<\/p>\s*<\/clanker-output>/);
});

for (const tag of ["aside", "clanker-output"]) {
  test(`renders Markdown and math inside ${tag} without requiring blank lines`, () => {
    const html = renderMarkdown(`<${tag}>\n**Strong**, *emphasis*, \`code\`, [link][ref], and $x^2$.\n\n- First\n- Second\n\n$$\nx^2 + y^2 = z^2\n$$\n\nFootnote[^note].\n</${tag}>\n\nOutside.\n\n[ref]: https://example.com\n[^note]: Shared footnote.`);
    assert.match(html, new RegExp(`<${tag}>\\s*<p><strong>Strong</strong>, <em>emphasis</em>, <code>code</code>`));
    assert.match(html, /<a href="https:\/\/example.com">link<\/a>/);
    assert.match(html, /<ul>\s*<li>First<\/li>\s*<li>Second<\/li>\s*<\/ul>/);
    assert.equal((html.match(/<math\b/g) || []).length, 2);
    assert.match(html, /display="block"/);
    assert.match(html, /<msup>/);
    assert.match(html, /class="footnote-ref"/);
    assert.match(html, /Shared footnote/);
    assert.match(html, new RegExp(`</${tag}>\\s*<p>Outside\\.</p>`));
    assert.doesNotMatch(html, /\*\*Strong\*\*|\$x\^2\$/);
  });
}

test("special blocks can nest without interpreting code examples as wrappers", () => {
  const html = renderMarkdown('<aside class="note">\nOuter.\n\n<clanker-output>**Inner**.</clanker-output>\n\n```html\n<aside>literal</aside>\n```\n</aside>');
  assert.match(html, /<aside class="note">\s*<p>Outer\.<\/p>/);
  assert.match(html, /<clanker-output>\s*<p><strong>Inner<\/strong>\.<\/p>\s*<\/clanker-output>/);
  assert.match(html.replace(/<\/?span\b[^>]*>/g, ""), /&lt;aside&gt;literal&lt;\/aside&gt;/);
});

test("math delimiters remain literal inside code", () => {
  const html = renderMarkdown('<aside>\n`$x$` and \\(y^2\\).\n\n```tex\n$$x$$\n```\n</aside>');
  assert.match(html, /<code>\$x\$<\/code>/);
  assert.match(html, /<math><msup><mi>y<\/mi>/);
  assert.match(html, /\$\$x\$\$/);
});

test("fails with essay and diagram context for invalid DOT", () => {
  assert.throws(() => renderMarkdown("```dot\nnot a graph\n```", { slug: "broken" }), /broken: invalid Graphviz diagram 1/);
});
