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
    else if (key === "photo")
      panel.photos.push({ name: value, pos: option || "center" });
  }
  return comic;
}

// Where photo cutouts sit in a panel.
const PHOTO_POS = {
  left: { x: 132, y: 188, r: 66 },
  center: { x: 220, y: 178, r: 84 },
  right: { x: 310, y: 188, r: 66 },
};

/**
 * Render one parsed panel to an SVG figure. `filterId` themes the art;
 * `images` maps uploaded names to data URLs (for `background:` and `photo:`).
 */
function renderPanel(panel, idx, filterId, images = {}) {
  const scene = CCSc.SCENES[panel.scene] || CCSc.SCENES.space;
  const missing = [];

  // Backdrop: an uploaded background image, else the scene art.
  let backdrop;
  if (panel.background && images[panel.background]) {
    backdrop = CCS.photoBackground(images[panel.background]);
  } else {
    if (panel.background) missing.push(panel.background);
    backdrop = scene.art(idx);
  }

  // Uploaded people as animated cutouts on top of the backdrop.
  let cutouts = "";
  (panel.photos || []).forEach((p, i) => {
    const href = images[p.name];
    if (!href) return missing.push(p.name);
    const a = PHOTO_POS[p.pos] || PHOTO_POS.center;
    const dx = i * 16;
    cutouts += `<g>${CCS.photoCutout(a.x + dx, a.y - i * 4, a.r, href, `ph${idx}-${i}`)}</g>`;
  });
  if (cutouts) cutouts = `<g class="cc-float">${cutouts}</g>`;

  // The backdrop + cutouts are filtered (painterly/gothic/…) so an uploaded
  // photo takes on the chosen style; balloons + captions stay crisp on top.
  const styled = backdrop + cutouts;
  let inner = filterId ? `<g filter="url(#${filterId})">${styled}</g>` : styled;

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
    `xmlns="http://www.w3.org/2000/svg">${inner}${warn}</svg>` +
    `<figcaption class="cc-num">${idx + 1}</figcaption></figure>`
  );
}

/** Render a whole parsed comic to an HTML string. `opts.theme` sets the style. */
function renderComic(comic, opts = {}) {
  const esc = CCS.escapeHtml;
  const title = esc(comic.title || "Untitled");
  const sub = comic.subtitle ? `<p>${esc(comic.subtitle)}</p>` : "";
  const splash = `<header class="cc-splash"><h1>${title}</h1>${sub}</header>`;
  const defs = CCTh ? CCTh.filterDefs() : "";

  if (!comic.panels.length) {
    return defs + splash + `<p class="cc-empty">No panels yet. Add a <code>panel</code> to your script.</p>`;
  }
  const fid = CCTh ? CCTh.filterId(opts.theme) : null;
  const images = opts.images || {};
  const panels = comic.panels
    .map((panel, idx) => renderPanel(panel, idx, fid, images))
    .join("");
  return defs + splash + `<div class="cc-grid">${panels}</div>`;
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

const CCComic = {
  parseScript,
  renderPanel,
  renderComic,
  firstYearTemplate,
  FIRST_YEAR_BEATS,
  LENGTHS,
};

if (typeof module !== "undefined" && module.exports) module.exports = CCComic;
if (typeof window !== "undefined") window.CCComic = CCComic;
