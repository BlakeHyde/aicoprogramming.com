import { readdir, readFile } from "node:fs/promises";
import matter from "gray-matter";
import { compareSerials, essayTree, serialParts } from "../_lib/essay-tree.js";


export default async function () {
  const directory = new URL("../../raw-essays/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^[a-z0-9][a-z0-9-]*\.md$/.test(name));
  const essays = await Promise.all(files.map(async (file) => {
    const { data, content } = matter(await readFile(new URL(file, directory), "utf8"));
    if (!data.title || data.serial == null || !content.trim()) {
      throw new Error(`${file}: essays need a title, serial, and body.`);
    }
    serialParts(data.serial);
    const slug = file.replace(/\.md$/, "");
    return {
      title: data.title,
      serial: data.serial,
      slug,
      url: `/essays/${slug}/`,
      body: content,
      excerpt: data.description || content.trim().split(/\n\s*\n/)[0].replace(/[*_`]/g, ""),
    };
  }));
  essays.sort(compareSerials);
  essayTree(essays);
  return essays.map((essay, index) => ({
    ...essay,
    previous: essays[index - 1],
    next: essays[index + 1],
  }));
}
