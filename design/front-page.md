The front page consists of a single headline:

**AI Co-Programming.**

Below is a "web" of articles.

```
001 {Title}
 |
002 {Title}
 |
003 {Title}
```

Each article is given a `Serial` number. This serial number is formatted as a
simple `1`, `2`, `3`, and so on, but may be elaborated: `2.1`. When these exist,
they will be presented as a "branch" within the tree:

```
001 {Title}
 |
002 {Title}
 |`---.
 |   001 {Title}
 |    |
 |   002 {Title}
 |
003 {Title}
```

These are not decimals, so `2.1.1` is valid. Maintain spacing between articles.

Each title is presented with a period afterward.

Each serial number is styled with three digits using leading zeroes.

Each serial number is circled with the number centered.

Connectors attach to circle edges with curved corners.

Connections are only at the top and bottom of circles.
