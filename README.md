# AI Co-Programming

A small, static essay site built with Eleventy. No client-side JavaScript, external fonts, or services are required.

## Develop

Use Node.js 22 or newer. TikZ diagrams also require XeLaTeX, TikZ/PGF, `standalone`, `fontspec`, `unicode-math`, and `dvisvgm`. On Debian/Ubuntu:

```sh
sudo apt-get update
sudo apt-get install --no-install-recommends texlive-xetex texlive-latex-extra texlive-pictures dvisvgm
```

Then install the Node dependencies and the pinned IBM Plex OpenType fonts:

```sh
npm ci
npm run setup:tikz-fonts
npm run dev
```

Open the local URL printed by Eleventy. `npm run build` writes the deployable site to `_site/`. `npm test` checks content loading and builds the site both at the domain root and under a repository subpath.

## Publish an essay

Add a Markdown file to `raw-essays/`, using a lowercase, hyphenated filename:

```md
---
title: An Essay Title
serial: 3
---

The essay goes here.
```

Essays are ordered by their unique integer `serial`. Their filenames become URLs (`raw-essays/premise.md` → `/essays/premise/`). An optional `description` field overrides the first-paragraph excerpt. Standard Markdown and trusted HTML are supported. Only regular filenames such as `premise.md` are published; editor autosaves, lock files, and backups are ignored.

The homepage, reading times, and previous/next links update automatically. Change the templates in `src/` and the theme in `src/assets/style.css`.

## TikZ diagrams

Use a `tikz` fence containing one `tikzpicture`. Text after the language name is its accessible description:

````md
```tikz A directed connection from A to B
\begin{tikzpicture}
  \node (a) {A};
  \node[right=of a] (b) {$B$};
  \draw[->] (a) -- (b);
\end{tikzpicture}
```
````

The build supplies the LaTeX document wrapper; do not include `\documentclass` or `\begin{document}`. Each fence must produce exactly one page. Fences also work inside `<aside>` and `<clanker-output>`.

- Labels default to 14.4pt (19.2 CSS pixels, matching the desktop body text) in **IBM Plex Sans**; `\texttt{…}` uses **IBM Plex Mono**, `\plexserif` selects **IBM Plex Serif**, and math uses **IBM Plex Math**.
- Shared colors are `siteInk` (`#335050`), `siteText` (`#113030`), and `siteBackground` (`#F6F9F9`). Drawings default to `siteInk`, with `siteText` labels and a transparent background. Ordinary TikZ options can override these defaults.
- Common libraries, including `positioning`, `arrows.meta`, `calc`, `shapes`, `matrix`, `fit`, and the path-morphing/replacing/marking decorations, are preloaded. The complete preamble is in `src/_lib/tikz.js`. Add other shared libraries there. Lua-only graph drawing is not supported by this XeLaTeX pipeline.
- XeLaTeX produces XDV using PGF's SVG driver; `dvisvgm` converts it to SVG with text outlined as paths. Fonts and geometry are preserved without depending on browser font loading. Outlined labels are not selectable or searchable: supply a meaningful fence description and explain complex diagrams in the surrounding text. Without a description, the accessible label is “TikZ diagram”.
- SVGs scale down on narrow screens. No browser-side TeX compiler or JavaScript is added.
- Smart quotes are applied at render time to titles, excerpts, diagram descriptions, and diagram label text. Source files are not rewritten. Slugs, URLs, diagram identifiers, code, and math primes remain literal.

`npm run setup:tikz-fonts` downloads fonts and their licenses from a pinned IBM Plex commit into `.cache/tikz/fonts/`. It is safe to rerun and is the only diagram setup step that requires a network connection. Compilation itself is local. The build does not silently substitute host fonts.

Compiled SVGs are cached in `.cache/tikz/svg/` by source, preamble, font revision, and tool versions. Delete that directory to force recompilation. SVG IDs and glyph references are namespaced per occurrence, so cached or repeated diagrams can share a page safely. Errors identify the essay and diagram number; failed compilations are not cached. Each compiler/converter process has a 60-second timeout.

**Only compile trusted repository content.** Shell escape is disabled, but TeX is not sandboxed and can read files. This feature must not be exposed to untrusted visitor input.

## GitHub Pages

1. Push this repository to GitHub with a `main` branch (or update the branch in `.github/workflows/pages.yml`).
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Push to `main`, or run the **Deploy to GitHub Pages** workflow manually.

The workflow installs the TeX toolchain, prepares the pinned fonts, and caches diagram output. It automatically handles both repository subpaths and sites served from a domain root. For a local subpath build, run `PATH_PREFIX=/repository-name/ npm run build`.

For a custom domain, configure it in the repository's Pages settings and set the corresponding DNS records. The repository name alone does not configure a custom domain.
