# AI Co-Programming

A small, static essay site built with Eleventy. No client-side JavaScript, external fonts, or services are required.

## Develop

Use Node.js 22 or newer.

```sh
npm ci
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

## GitHub Pages

1. Push this repository to GitHub with a `main` branch (or update the branch in `.github/workflows/pages.yml`).
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Push to `main`, or run the **Deploy to GitHub Pages** workflow manually.

The workflow automatically handles both repository subpaths and sites served from a domain root. For a local subpath build, run `PATH_PREFIX=/repository-name/ npm run build`.

For a custom domain, configure it in the repository's Pages settings and set the corresponding DNS records. The repository name alone does not configure a custom domain.
