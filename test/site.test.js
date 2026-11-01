import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import loadEssays from "../src/_data/essays.js";
import { compareSerials, essayTree, serialParts } from "../src/_lib/essay-tree.js";
import nunjucks from "nunjucks";

const essays = await loadEssays();

test("serial trees sort integer segments and support nested branches", async () => {
  const serials = ["10", "2.10", "2.1.1", "3", "2.1", "2", "1"];
  const fixture = serials.map((serial) => ({ serial, title: `Title ${serial}`, url: `/test/${serial}/` }));
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
  for (const serial of serials) assert.ok(html.includes(`aria-label="Essay ${serial}"`));
  assert.ok(html.indexOf("Title 2.1</h2>") < html.indexOf("Title 2.1.1</h2>"));
  assert.ok(html.indexOf("Title 2.1.1</h2>") < html.indexOf("Title 2.10</h2>"));
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
  assert.equal((questions.html.match(/<svg /g) || []).length, (questions.body.match(/^```(?:dot|graphviz)\b/gm) || []).length);
  assert.match(questions.html, /class="footnote-ref"/);
  assert.deepEqual(essays.map((essay) => essay.serial), [...essays].sort(compareSerials).map((essay) => essay.serial));
  essays.forEach((essay, index) => {
    assert.match(essay.slug, /^[a-z0-9-]+$/);
    assert.ok(essay.html.includes("<p>"));
    assert.equal(essay.previous?.slug, essays[index - 1]?.slug);
    assert.equal(essay.next?.slug, essays[index + 1]?.slug);
  });
});

for (const prefix of ["/", "/example-repository/"]) {
  test(`builds navigable pages at ${prefix}`, async () => {
    execFileSync("node", ["node_modules/@11ty/eleventy/cmd.cjs"], {
      env: { ...process.env, PATH_PREFIX: prefix },
      stdio: "pipe",
    });
    for (const url of ["/", ...essays.map((essay) => essay.url)]) {
      const html = await readFile(`_site${url}index.html`, "utf8");
      assert.match(html, /<html lang="en">/);
      assert.match(html, /id="main"/);
      if (url === "/") {
        assert.match(html, /class="essay-pathway"/);
        assert.match(html, /<h1>AI Co-Programming\.<\/h1>/);
        assert.equal((html.match(/<h1>/g) || []).length, 1);
        assert.doesNotMatch(html, /class="intro"|class="lede"|class="reading-time"|class="site-header"|class="site-footer"/);
        assert.match(html, /family=IBM\+Plex\+Mono/);
        assert.match(html, /family=IBM\+Plex\+Sans/);
        for (const essay of essays) {
          assert.ok(html.includes(`<h2>${essay.title}</h2>`));
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
