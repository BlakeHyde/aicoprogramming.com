import { RenderPlugin } from "@11ty/eleventy";
import { essayTree } from "./src/_lib/essay-tree.js";
import { renderMarkdown } from "./src/_lib/markdown.js";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(RenderPlugin);
  eleventyConfig.addFilter("essayMarkdown", (content, slug) => renderMarkdown(content, { slug }));
  eleventyConfig.addFilter("essayTree", essayTree);
  eleventyConfig.addFilter("serialLabel", (serial) => String(serial).split(".").map((part) => part.padStart(3, "0")).join("."));
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets", "src/CNAME": "CNAME" });
  eleventyConfig.addWatchTarget("raw-essays/*.md");
  eleventyConfig.addFilter("readingTime", (text) => Math.max(1, Math.ceil(text.split(/\s+/).length / 220)));
  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    htmlTemplateEngine: "njk",
  };
}
