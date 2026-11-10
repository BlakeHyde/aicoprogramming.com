import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderMarkdown } from "../src/_lib/markdown.js";

const codeText = (html) => html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/)[1]
  .replace(/<\/?span\b[^>]*>/g, "")
  .replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ({
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'",
  })[entity]);

test("C fences get build-time token markup without changing their source text", () => {
  const source = '#include <stdio.h>\n// A "literal" comment\nint main(void) {\n\tprintf("it\'s <code> & text\\n");\n\treturn 42;\n}\n';
  const html = renderMarkdown(`\`\`\`c\n${source}\`\`\``);
  assert.match(html, /<code class="language-c">/);
  for (const token of ["comment", "keyword", "number", "string"]) assert.ok(html.includes(`hljs-${token}`));
  assert.equal(codeText(html), source);
  assert.doesNotMatch(html, /<script\b|<link\b/);
});

test("common language aliases highlight while unknown and unlabelled fences stay escaped plain text", () => {
  for (const language of ["js", "javascript", "py", "python", "cpp"]) {
    const source = language === "py" || language === "python" ? "return True" : "return 42;";
    assert.match(renderMarkdown(`\`\`\`${language}\n${source}\n\`\`\``), /class="hljs-keyword"/);
  }
  for (const language of ["", "unknown-language", "text"]) {
    const source = '<script>alert("it\'s literal")</script>\n';
    const html = renderMarkdown(`\`\`\`${language}\n${source}\`\`\``);
    assert.doesNotMatch(html, /hljs-|<script\b/);
    assert.equal(codeText(html), source);
  }
});

test("highlighting works inside special blocks and leaves inline code alone", () => {
  for (const tag of ["aside", "clanker-output"]) {
    const html = renderMarkdown(`<${tag}>\n\`\`\`c\nreturn 1;\n\`\`\`\n</${tag}>`);
    assert.match(html, new RegExp(`<${tag}>\\s*<pre><code class="language-c">`));
    assert.match(html, /hljs-keyword/);
  }
  assert.equal(renderMarkdown('`return "it\'s";`'), '<p><code>return &quot;it\'s&quot;;</code></p>\n');
});

test("highlight token styling is scoped to code blocks and uses only shades and loaded weights", async () => {
  const css = await readFile("src/assets/style.css", "utf8");
  const template = await readFile("src/_includes/base.njk", "utf8");
  assert.match(template, /IBM\+Plex\+Mono:wght@400;500;600/);
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]*hljs-[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 4);
  for (const [, selectors, declarations] of rules) {
    for (const selector of selectors.split(",")) assert.ok(selector.trim().startsWith(".prose pre .hljs-"));
    assert.doesNotMatch(declarations, /font-size|line-height|font-style|background/);
    for (const [, weight] of declarations.matchAll(/font-weight:\s*(\d+)/g)) assert.ok(["400", "500", "600"].includes(weight));
    for (const [, color] of declarations.matchAll(/color:\s*([^;]+)/g)) assert.ok(["var(--ink)", "var(--body)", "#526969"].includes(color));
  }
});
