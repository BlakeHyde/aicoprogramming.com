# Fonts

- Headers are IBM Plex Mono. Copy is IBM Plex Sans.
- GraphViz diagrams should use the IBM Plex family as well.
- LaTeX math uses IBM Plex Math.

# Colors

- Headers and "base" color: #335050
- Text: #113030
- Background: #F6F9F9

# Special Blocks

- Markdown and mathematics must be respected within blocks.
- Text within blocks must be aligned on its baseline with body text.

## `<clanker-output>`

- Set in IBM Plex Serif.
- Background color is #ced6d6.
- Block quote styling.
- Vector "space invader" image in the left of the block background, non-repeating, as a watermark.
  - This is offset in small blocks, to achieve a "cropped to the middle" look with the sprite centered and cut off on the top and bottom.
  - In large blocks, the watermark is in the top left, a couple of chunky "pixels" down from the top
  - The watermark must be large and faint to avoid competing with the text.

## `<aside>`

- Background color is #ced6d6.
- Block quote styling.
- Offset into the right margin with text flow to the left on the primary web view.
- Inline on mobile.
