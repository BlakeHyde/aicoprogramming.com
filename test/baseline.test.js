import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const chromium = process.env.CHROMIUM || "chromium";
let hasChromium = false;
try {
  execFileSync(chromium, ["--version"], { stdio: "ignore", timeout: 10000 });
  hasChromium = true;
} catch {}

test("prose and inline code share the aside grid; blocks and footnotes have their own rhythm", {
  skip: !hasChromium && "Set CHROMIUM to a Chromium executable to run layout checks",
}, async () => {
  // Keep the fixture in the project rather than /tmp, which snap Chromium isolates.
  const directory = await mkdtemp(path.resolve(".baseline-test-"));
  try {
    const css = await readFile("src/assets/style.css", "utf8");
    const marker = '<span class="baseline-marker"></span>';
    const fixture = `<!doctype html><meta charset="utf-8">
      <style>${css}
      .baseline-marker { display: inline-block; width: 0; height: 0; vertical-align: baseline; }
      </style>
      <main class="shell"><article class="article"><div class="prose">
        <aside>
          <p>${marker}Aside line one.<br>${marker}With <code>add 10 5</code> inline code.<br>${marker}Another <code>add (x: Int)</code> line.</p>
          <p>${marker}Second aside paragraph.<br>${marker}Another line.</p>
        </aside>
        <p>${marker}Body line one.<br>${marker}Body line two.</p>
        <p>${marker}Second body paragraph.<br>${marker}Another body line.</p>
        <pre><code>${marker}add 10 5\n${marker}add 6 7</code></pre>
        <p class="after-code">${marker}Body after code.</p>
        <hr>
        <section class="footnotes"><ol class="footnotes-list"><li class="footnote-item">
          <p>${marker}Footnote line one.<br>${marker}Footnote line two.</p>
        </li></ol></section>
      </div></article></main>
      <script>
        const prose = document.querySelector('.prose');
        const result = {
          step: parseFloat(getComputedStyle(prose).lineHeight),
          baselines: [...document.querySelectorAll('.baseline-marker')].filter(el => !el.closest('.footnotes, pre, .after-code')).map(el => el.getBoundingClientRect().top),
          bodySize: parseFloat(getComputedStyle(prose).fontSize),
          footnoteSize: parseFloat(getComputedStyle(document.querySelector('.footnotes')).fontSize),
          footnoteStep: parseFloat(getComputedStyle(document.querySelector('.footnotes')).lineHeight),
          footnoteBaselines: [...document.querySelectorAll('.footnotes .baseline-marker')].map(el => el.getBoundingClientRect().top),
          codeStep: parseFloat(getComputedStyle(document.querySelector('pre')).lineHeight),
          codeSize: parseFloat(getComputedStyle(document.querySelector('pre code')).fontSize),
          preSize: parseFloat(getComputedStyle(document.querySelector('pre')).fontSize),
          codeBaselines: [...document.querySelectorAll('pre .baseline-marker')].map(el => el.getBoundingClientRect().top),
          floats: getComputedStyle(document.querySelector('aside')).float,
        };
        document.body.append(Object.assign(document.createElement('pre'), {
          id: 'layout-result', textContent: JSON.stringify(result),
        }));
      </script>`;
    const file = path.join(directory, "index.html");
    await writeFile(file, fixture);
    for (const width of [1200, 1201, 540]) {
      const html = execFileSync(chromium, [
        "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        `--window-size=${width},1000`, "--dump-dom", pathToFileURL(file).href,
      ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
      const match = html.match(/<pre id="layout-result">([^<]+)<\/pre>/);
      assert.ok(match, "Chromium returned layout measurements");
      const { step, baselines, floats, bodySize, footnoteSize, footnoteStep, footnoteBaselines, codeStep, codeSize, preSize, codeBaselines } = JSON.parse(match[1]);
      assert.equal(baselines.length, 9);
      assert.ok(codeStep < step, "Code blocks use a more compact line height than prose");
      assert.ok(Math.abs(codeBaselines[1] - codeBaselines[0] - codeStep) < .2);
      assert.equal(codeSize, preSize, "Code size must not be reduced twice");
      assert.ok(Math.abs(codeSize / bodySize - .85) < .001);
      assert.ok(Math.abs(footnoteSize / bodySize - .875) < .001);
      assert.ok(footnoteStep < step);
      assert.ok(Math.abs(footnoteBaselines[1] - footnoteBaselines[0] - footnoteStep) < .2);
      assert.equal(floats, width > 1100 ? "right" : "none");
      for (const baseline of baselines) {
        const lines = (baseline - baselines[0]) / step;
        assert.ok(Math.abs(lines - Math.round(lines)) * step < 0.2,
          `At ${width}px: baseline ${baseline} is off the ${step}px grid (origin ${baselines[0]})`);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
