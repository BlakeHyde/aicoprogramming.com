import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nunjucks from "nunjucks";
import { essayTree } from "../src/_lib/essay-tree.js";

const chromium = process.env.CHROMIUM || "chromium";
let hasChromium = false;
try {
  execFileSync(chromium, ["--version"], { stdio: "ignore", timeout: 10000 });
  hasChromium = true;
} catch {}

test("tree connectors clip zero-height paths and follow wrapped and nested titles", {
  skip: !hasChromium && "Set CHROMIUM to a Chromium executable to run layout checks",
}, async () => {
  const directory = await mkdtemp(path.resolve(".tree-test-"));
  try {
    const css = await readFile("src/assets/style.css", "utf8");
    const template = (await readFile("src/index.njk", "utf8")).replace(/^---[\s\S]*?---/, "");
    const environment = new nunjucks.Environment(null, { autoescape: true });
    environment.addFilter("essayTree", essayTree);
    environment.addFilter("url", (url) => url);
    const essays = ["1", "1.1", "2", "2.1", "2.1.1", "3"].map((serial) => ({
      serial,
      title: serial === "2" ? "A deliberately long parent title that wraps across several lines on a narrow screen" : "Short",
      url: "#",
    }));
    const fixture = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>${css}</style><main class="shell">${environment.renderString(template, { essays })}</main>
      <script>
        const rect = el => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
        };
        const result = {
          trunks: [...document.querySelectorAll('.main-connector')].map(el => ({
            rect: rect(el),
            circle: rect(el.parentElement.querySelector('.essay-number')),
            parent: rect(el.parentElement),
            overflow: getComputedStyle(el).overflow,
          })),
          branches: [...document.querySelectorAll('.branch-connector')].map(el => ({
            rect: rect(el),
            parentLink: rect(el.closest('ol').parentElement.querySelector(':scope > a')),
            parentCircle: rect(el.closest('ol').parentElement.querySelector(':scope > a > .essay-number')),
            childCircle: rect(el.parentElement.querySelector(':scope > a > .essay-number')),
          })),
        };
        document.body.append(Object.assign(document.createElement('pre'), {
          id: 'layout-result', textContent: JSON.stringify(result),
        }));
      </script>`;
    const file = path.join(directory, "index.html");
    await writeFile(file, fixture);
    const near = (a, b) => assert.ok(Math.abs(a - b) < .1, `${a} should equal ${b}`);
    for (const width of [320, 390, 440, 1200, 1201]) {
      const html = execFileSync(chromium, [
        "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        `--window-size=${width},1000`, "--dump-dom", pathToFileURL(file).href,
      ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
      const match = html.match(/<pre id="layout-result">([^<]+)<\/pre>/);
      assert.ok(match, "Chromium returned tree measurements");
      const { trunks, branches } = JSON.parse(match[1]);
      assert.ok(trunks.some(({ rect }) => rect.height === 0), "Includes the zero-height SVG that leaked in WebKit");
      if (width <= 440) assert.ok(trunks.some(({ parent, circle }) => parent.height > circle.height));
      for (const { rect, circle, parent, overflow } of trunks) {
        assert.equal(overflow, "hidden", "Clip degenerate SVGs rather than painting their unscaled paths");
        near(rect.x + rect.width / 2, circle.x + circle.width / 2);
        near(rect.y, circle.bottom);
        near(rect.bottom, parent.bottom);
      }
      assert.equal(branches.length, 3);
      for (const { rect, parentLink, parentCircle, childCircle } of branches) {
        near(rect.x, parentCircle.x + parentCircle.width / 2);
        near(rect.x + rect.width, childCircle.x + childCircle.width / 2);
        near(rect.y, parentLink.bottom);
        near(rect.bottom, childCircle.y);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
