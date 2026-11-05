import test from "node:test";
import assert from "node:assert/strict";
import { smartQuotes, smartSvgLabels, smartTikzLabels } from "../src/_lib/typography.js";
import { renderMarkdown } from "../src/_lib/markdown.js";
import loadEssays from "../src/_data/essays.js";

test("plain-text typography handles titles without interpreting markup", () => {
  assert.equal(smartQuotes(`It's a "Small World"`), "It’s a “Small World”");
  assert.equal(smartQuotes(`'A' & "B" <C> *D*`), "‘A’ & “B” <C> *D*");
  assert.equal(smartQuotes("Already “curly” and it’s unchanged"), "Already “curly” and it’s unchanged");
});

test("essay titles and excerpts are typographic without changing slugs, URLs, or source", async () => {
  const essays = await loadEssays();
  const essay = essays.find(({ slug }) => slug === "small-world");
  assert.ok(essay);
  assert.equal(essay.title, "It’s a Small World");
  assert.equal(essay.url, "/essays/small-world/");
  assert.match(essay.excerpt, /“artificial intelligence”/);
  assert.match(essay.body, /"artificial intelligence"/);
  assert.equal(essays.find(({ next }) => next?.slug === "small-world").next.title, essay.title);
});

test("Markdown prose gets smart quotes, but code and link destinations remain literal", () => {
  const html = renderMarkdown(`It's a "quote". ["Link"](https://example.com/it's)\n\n\`"code" isn't prose\`\n\n\`\`\`js\nconst x = "it's";\n\`\`\``);
  assert.match(html, /It’s a “quote”/);
  assert.match(html, />“Link”<\/a>/);
  assert.match(html, /href="https:\/\/example.com\/it's"/);
  assert.match(html, /<code>&quot;code&quot; isn't prose<\/code>/);
  assert.match(html, /const x = &quot;it's&quot;;/);
});

test("SVG label typography decodes entities and leaves identifiers and URLs alone", () => {
  const svg = `<svg><text id="it's-an-id">It&apos;s &quot;A &amp; B&quot;</text><a href="https://example.com/it's"><text>"Link"</text></a></svg>`;
  const result = smartSvgLabels(svg);
  assert.match(result, />It’s “A &amp; B”<\/text>/);
  assert.match(result, />“Link”<\/text>/);
  assert.match(result, /id="it's-an-id"/);
  assert.match(result, /href="https:\/\/example.com\/it's"/);
});

test("Graphviz labels and diagram descriptions use smart quotes without rewriting DOT IDs", () => {
  const html = renderMarkdown(String.raw`\`\`\`dot It's a "diagram"
  digraph { "it's-an-id" [label="It's a \"small\" world", URL="https://example.com/it's"]; }
\`\`\``.replaceAll("\\`", "`"), { slug: "quotes" });
  assert.match(html, /aria-label="It’s a “diagram”"/);
  assert.match(html, />It’s a “small” world<\/text>/);
  assert.match(html, /xlink:href="https:\/\/example.com\/it(?:&#39;|&apos;|')s"/);
});

test("TikZ typography rewrites balanced node and edge label text, not the program", () => {
  const source = String.raw`% \node (ignore) {"comment"};
\node[draw, name={raw'name}] (node-one) {It's a "small" \emph{world}; $f'(x)$ and \texttt{"code"} and \href{https://example.com/it's}{"link"}};
\draw (node-one) -- node[above] {"edge"} (other);
\node (other) {\"o and ${"``TeX''"} and \(g'(y)\)};`;
  const result = smartTikzLabels(source);
  assert.match(result, /It’s a “small” \\emph\{world\}/);
  assert.match(result, /node\[above\] \{“edge”\}/);
  assert.ok(result.includes(`$f'(x)$`));
  assert.ok(result.includes(String.raw`\(g'(y)\)`));
  assert.ok(result.includes(String.raw`\texttt{"code"}`));
  assert.ok(result.includes(String.raw`\href{https://example.com/it's}{“link”}`));
  assert.ok(result.includes(`name={raw'name}`));
  assert.ok(result.includes(String.raw`% \node (ignore) {"comment"};`));
  assert.ok(result.includes(String.raw`\"o and “TeX”`));
});

test("TikZ option labels get smart quotes without changing option keys or quote delimiters", () => {
  const source = String.raw`\node[name={it's-raw},label={above:It's "good"},pin={[name=raw'id]below:"pin"}] (a) {A};
\draw["It's an edge",name={raw'id}] (a) -- (b);`;
  const result = smartTikzLabels(source);
  assert.ok(result.includes(`name={it's-raw}`));
  assert.ok(result.includes(`label={above:It’s “good”}`));
  assert.ok(result.includes(`pin={[name=raw'id]below:“pin”}`));
  assert.ok(result.includes(`\\draw["It’s an edge",name={raw'id}]`));
});
