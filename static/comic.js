/*
 * The comic engine: parse the writer's script into a structured comic, then
 * render that structure into SVG panels. Pure functions — the browser app and
 * the tests share them.
 */
const CCS = typeof require !== "undefined" ? require("./sprites.js") : window.CCSprites;
const CCSc = typeof require !== "undefined" ? require("./scenes.js") : window.CCScenes;
const CCTh = typeof require !== "undefined" ? require("./themes.js") : window.CCThemes;

const PANEL_KEYS = new Set([
  "scene", "wide", "caption", "say", "speech", "sfx", "photo", "background",
]);

/**
 * Parse a line-based script. Meta lines (`title:`, `subtitle:`) come first;
 * `panel` starts a new panel; `key: value` lines fill the current panel. A
 * caption can target the bottom with `caption[bottom]:`.
 */
function parseScript(text) {
  const comic = { title: "", subtitle: "", panels: [] };
  let panel = null;

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.toLowerCase() === "panel") {
      panel = {
        scene: "space", wide: false, captions: [], says: [], sfx: [],
        photos: [], background: null,
      };
      comic.panels.push(panel);
      continue;
    }

    const match = line.match(/^([a-zA-Z]+)(\[[a-z]+\])?\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const option = match[2] ? match[2].slice(1, -1) : null;
    const value = match[3].trim();

    if (!panel) {
      if (key === "title") comic.title = value;
      else if (key === "subtitle") comic.subtitle = value;
      continue;
    }
    if (!PANEL_KEYS.has(key)) continue;

    if (key === "scene") panel.scene = value.toLowerCase();
    else if (key === "wide") panel.wide = /^(true|yes|1)$/i.test(value);
    else if (key === "caption")
      panel.captions.push({ text: value, pos: option === "bottom" ? "bottom" : "top" });
    else if (key === "say" || key === "speech") panel.says.push(value);
    else if (key === "sfx") panel.sfx.push(value);
    else if (key === "background") panel.background = value;
    else if (key === "photo") panel.photos.push({ name: value, pos: option || null });
  }
  return comic;
}

// Explicit photo corners (used when the writer forces `photo[left]:` etc.);
// otherwise a photo lands on the scene's own person anchor.
const PHOTO_POS = {
  left: { x: 128, y: 190, r: 64 },
  center: { x: 220, y: 168, r: 86 },
  right: { x: 312, y: 190, r: 64 },
};

// A repeating SMIL transform (native SVG — animates reliably in every browser,
// even inside filters, unlike CSS transforms on SVG).
function _anim(type, values, dur, begin) {
  return (
    `<animateTransform attributeName="transform" attributeType="XML" type="${type}" ` +
    `values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" additive="sum"/>`
  );
}

// A floating "sticker" wiggle for an uploaded person cutout.
function _floatAnim(cx, cy, i) {
  return (
    _anim("translate", "0 0; 0 -8; 0 0", 3 + i * 0.4, i * 0.5) +
    _anim("rotate", `-2.5 ${cx} ${cy}; 2.5 ${cx} ${cy}; -2.5 ${cx} ${cy}`, 5 + i * 0.4, i * 0.5)
  );
}

// A slow ken-burns zoom about a background's centre.
function _kenBurns(inner) {
  return (
    `<g transform="translate(220 150)"><g>` +
    _anim("scale", "1; 1.08; 1", 18, 0) +
    `<g transform="translate(-220 -150)">${inner}</g></g></g>`
  );
}

// The default cartoon drawn for a figure when no photo is cast to its role. The
// figure's (x, y) is the head/cutout centre, so each sprite is offset to land
// its head there.
function _figureSprite(fig) {
  const s = fig.s || 1;
  if (fig.role && fig.role.indexOf("parent") === 0) return CCS.kid(fig.x, fig.y + 34 * s, s);
  if (fig.role === "pet") return CCS.dog(fig.x - 16 * s, fig.y + 8 * s, s);
  return CCS.baby(fig.x, fig.y, s, fig.mood);
}

/**
 * Render one parsed panel to an SVG figure. `theme` styles the art (a per-panel
 * SVG filter); `images` maps uploaded names to data URLs; `animate` toggles the
 * SMIL motion on uploaded photos.
 */
function renderPanel(panel, idx, theme, images = {}, animate = true, cast = {}) {
  const scene = CCSc.SCENES[panel.scene] || CCSc.SCENES.space;
  const missing = [];

  // The theme filter lives in THIS panel's <svg> under a unique id — SVG
  // filters only resolve within their own <svg>. It's applied to the leaf
  // <image>/scene, so the animation wrappers around them stay un-filtered.
  const themed = CCTh && CCTh.hasFilter(theme);
  const fid = themed ? `ccf-${theme}-${idx}` : null;
  const fdefs = themed ? `<defs>${CCTh.filterMarkup(theme, fid)}</defs>` : "";

  // Backdrop: an uploaded background image (with a ken-burns drift), else the
  // scene art.
  let backdrop;
  if (panel.background && images[panel.background]) {
    const img = CCS.photoBackground(images[panel.background], fid);
    backdrop = animate ? _kenBurns(img) : img;
  } else {
    if (panel.background) missing.push(panel.background);
    backdrop = fid ? `<g filter="url(#${fid})">${scene.art(idx)}</g>` : scene.art(idx);
  }

  // Cast figures: each scene slot is either the cast person's photo (floating)
  // or the default cartoon, styled to match.
  let figures = "";
  (scene.figures || []).forEach((fig, i) => {
    const imgName = cast[fig.role];
    if (imgName && images[imgName]) {
      const cut = CCS.photoCutout(fig.x, fig.y, fig.r, images[imgName], `fig${idx}-${i}`, fid);
      figures += `<g>${animate ? _floatAnim(fig.x, fig.y, i) : ""}${cut}</g>`;
    } else {
      const sprite = _figureSprite(fig);
      figures += fid ? `<g filter="url(#${fid})">${sprite}</g>` : sprite;
    }
  });

  // Manual `photo:` people, placed on the scene's person anchor (crib, hill,
  // tub…) unless the writer forces a corner.
  const base = CCSc.personAnchor(panel.scene);
  let cutouts = "";
  (panel.photos || []).forEach((p, i) => {
    const href = images[p.name];
    if (!href) return missing.push(p.name);
    const a = p.pos && PHOTO_POS[p.pos] ? PHOTO_POS[p.pos] : base;
    const cx = a.x + i * 18;
    const cy = a.y - i * 6;
    const cut = CCS.photoCutout(cx, cy, a.r, href, `ph${idx}-${i}`, fid);
    cutouts += `<g>${animate ? _floatAnim(cx, cy, i) : ""}${cut}</g>`;
  });

  let inner = fdefs + backdrop + figures + cutouts;
  for (const cap of panel.captions) inner += CCS.caption(cap.text, cap.pos);

  const b = scene.bubble;
  panel.says.forEach((text, i) => {
    inner += CCS.speech(b.x, b.y + i * (b.h + 8), b.w, b.h, text, b.tail);
  });

  panel.sfx.forEach((text, i) => {
    inner += CCS.sfx(scene.sfx.x + i * 74, scene.sfx.y, text);
  });

  const wide = panel.wide || scene.wide;
  let warn = "";
  if (!CCSc.SCENES[panel.scene] && !panel.background)
    warn += `<text x="12" y="276" class="cc-warn">unknown scene: ${CCS.escapeHtml(panel.scene)}</text>`;
  if (missing.length)
    warn += `<text x="12" y="290" class="cc-warn">missing image: ${CCS.escapeHtml(missing.join(", "))}</text>`;

  return (
    `<figure class="cc-panel${wide ? " wide" : ""}">` +
    `<svg viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice" class="cc-svg" ` +
    `xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    `${inner}${warn}</svg>` +
    `<figcaption class="cc-num">${idx + 1}</figcaption></figure>`
  );
}

/** Render a whole parsed comic to an HTML string. `opts.theme` sets the style. */
function renderComic(comic, opts = {}) {
  const esc = CCS.escapeHtml;
  const title = esc(comic.title || "Untitled");
  const sub = comic.subtitle ? `<p>${esc(comic.subtitle)}</p>` : "";
  const splash = `<header class="cc-splash"><h1>${title}</h1>${sub}</header>`;

  if (!comic.panels.length) {
    return splash + `<p class="cc-empty">No panels yet. Add a <code>panel</code> to your script.</p>`;
  }
  const theme = opts.theme;
  const images = opts.images || {};
  const animate = opts.animate !== false;
  const cast = opts.cast || {};
  const panels = comic.panels
    .map((panel, idx) => renderPanel(panel, idx, theme, images, animate, cast))
    .join("");
  return splash + `<div class="cc-grid">${panels}</div>`;
}

// ── First-year story template ─────────────────────────────────────────────────
// A curated arc of beats; a length picks a subset that still reads start→end.
const FIRST_YEAR_BEATS = [
  ["nursery", "The day we brought you home, the whole world got quieter and softer."],
  ["first-smile", "Then one morning you smiled — and I forgot every sleepless night."],
  ["bath-time", "Splash! You decided bath time was the best invention ever made."],
  ["first-food", "You met real food. The food mostly lost."],
  ["crawling", "You learned to crawl, and suddenly nothing in the house was safe."],
  ["first-steps", "One… two… three wobbly steps onto your own two feet."],
  ["park-day", "We took you to meet the world: grass, sky, and a very serious duck."],
  ["bedtime", "Every night ended the same — tiny hands, enormous dreams."],
  ["first-birthday", "One whole year. One perfect cake. One very happy mess."],
  ["family", "You made us a family. Happy first birthday, our love."],
];

const LENGTHS = {
  short: [0, 1, 8, 9],
  medium: [0, 1, 3, 5, 7, 8, 9],
  long: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
};

/** Build a starter first-year script with the chosen length ("short"|"medium"|"long"). */
function firstYearTemplate(length = "medium", name = "Her") {
  const pick = LENGTHS[length] || LENGTHS.medium;
  const lines = [`title: ${name} First Year`, "subtitle: a year in pictures", ""];
  for (const i of pick) {
    const [scene, caption] = FIRST_YEAR_BEATS[i];
    lines.push("panel", `  scene: ${scene}`, `  caption: ${caption}`, "");
  }
  return lines.join("\n");
}

/** How many panels a length name means (short=4, medium=7, long=10). */
function lengthCount(name) {
  return (LENGTHS[name] || LENGTHS.medium).length;
}

// Split a script into its preamble (title/subtitle lines) and per-panel blocks.
function splitPanels(text) {
  const preamble = [];
  const blocks = [];
  let current = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (line.trim().toLowerCase() === "panel") {
      if (current) blocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) blocks.push(current);
  return { preamble, blocks };
}

function _trimTail(arr) {
  const out = arr.slice();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

/**
 * Resize a script to `target` panels: drop the extras when shortening (keeping
 * your first panels and their edits), or append fresh first-year beats when
 * lengthening. Pure — the editor calls it, the tests check it.
 */
function resizeScript(text, target) {
  const { preamble, blocks } = splitPanels(text);
  const kept = blocks.slice(0, target);

  if (kept.length < target) {
    const used = new Set();
    for (const b of blocks) {
      const m = b.join("\n").match(/scene:\s*([a-z0-9-]+)/i);
      if (m) used.add(m[1].toLowerCase());
    }
    const fresh = FIRST_YEAR_BEATS.filter(([s]) => !used.has(s));
    let i = 0;
    while (kept.length < target) {
      const [scene, caption] = fresh[i] || FIRST_YEAR_BEATS[i % FIRST_YEAR_BEATS.length];
      i++;
      kept.push(["panel", `  scene: ${scene}`, `  caption: ${caption}`]);
    }
  }

  const pre = _trimTail(preamble).join("\n");
  const body = kept.map((b) => _trimTail(b).join("\n")).join("\n\n");
  return (pre ? pre + "\n\n" : "") + body + "\n";
}

const CCComic = {
  parseScript,
  renderPanel,
  renderComic,
  firstYearTemplate,
  resizeScript,
  splitPanels,
  lengthCount,
  FIRST_YEAR_BEATS,
  LENGTHS,
};

if (typeof module !== "undefined" && module.exports) module.exports = CCComic;
if (typeof window !== "undefined") window.CCComic = CCComic;
