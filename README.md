# Comic Creator

> Write the story. See it drawn.

A zero-dependency web app where **you write a short script** and it renders a
comic book — panels, narration boxes, speech balloons, and vector art — live as
you type. It opens with an original example story, **"SIGNAL,"** which you can
rewrite into your own.

Open `index.html` in a browser (no build step), or serve the folder:

```bash
open index.html            # macOS
python3 -m http.server      # then visit localhost:8000
```

Edit the script on the left; the comic redraws on the right and saves to your
browser. **Print / PDF** exports just the pages.

## Writing a script

The script is plain text, line by line:

```
title: SIGNAL
subtitle: a very short story

panel
  scene: listen
  sfx: blip
  caption: On the hundredth night, it heard something.

panel
  scene: earth-call
  say: Is anybody out there?
  caption[bottom]: Across the dark, hello is the oldest word.
```

- `title:` / `subtitle:` — the cover text (must come before the first panel).
- `panel` — starts a new panel.
- `scene:` — which backdrop to draw (see below).
- `caption:` — a narration box (top by default; `caption[bottom]:` pins it low).
- `say:` — a speech balloon. Repeat it for multiple balloons.
- `sfx:` — a sound-effect burst (`blip`, `click`, …).
- `wide: yes` — make the panel span the full row.
- Blank lines and `// comments` are ignored.

## Scenes

The art is a curated set of backdrops the writer picks from (the words are
yours). Available scenes:

| Scene | Picture |
|-------|---------|
| `drift` | a lone probe adrift in deep space |
| `listen` | close on the probe, a green blip nearby |
| `turn` | the probe turning toward a blue world |
| `earth-call` | a child on a hill with a homemade antenna |
| `reply` | the probe firing a single beam of light |
| `answered` | the child, and a star blinking back (wide) |
| `space` | a generic starfield + planet |

## Layout

```
comic_creator/
├─ index.html              editor + live comic
├─ static/
│  ├─ sprites.js           vector-art primitives → SVG (stars, probe, kid, bubbles…)
│  ├─ scenes.js            scene library: composed backdrops + balloon anchors
│  ├─ comic.js             parse script → structure → rendered SVG panels (pure)
│  ├─ app.js               the live editor wiring
│  └─ styles.css
└─ tests/
   └─ comic.test.js        node:test coverage of the parser + renderer
```

## Test

```bash
node --test        # or: npm test
```

Covers the script parser, panel/comic rendering, HTML escaping, scene art
integrity, and edge cases (unknown scene, empty comic, comments).
