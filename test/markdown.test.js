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

test("preserves ordinary code fences and trusted HTML", () => {
  const html = renderMarkdown('```js\nconst x = "<svg>";\n```\n\n<dl><dt>Input</dt><dd>SQL</dd></dl>');
  assert.match(html, /class="language-js"/);
  assert.match(html, /&lt;svg&gt;/);
  assert.match(html, /<dl><dt>Input<\/dt><dd>SQL<\/dd><\/dl>/);
});

test("fails with essay and diagram context for invalid DOT", () => {
  assert.throws(() => renderMarkdown("```dot\nnot a graph\n```", { slug: "broken" }), /broken: invalid Graphviz diagram 1/);
});
