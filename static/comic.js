/*
 * The comic engine: parse the writer's script into a structured comic, then
 * render that structure into SVG panels. Pure functions — the browser app and
 * the tests share them.
 */
const CCS = typeof require !== "undefined" ? require("./sprites.js") : window.CCSprites;
const CCSc = typeof require !== "undefined" ? require("./scenes.js") : window.CCScenes;

const PANEL_KEYS = new Set(["scene", "wide", "caption", "say", "speech", "sfx"]);

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
      panel = { scene: "space", wide: false, captions: [], says: [], sfx: [] };
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
  }
  return comic;
}

/** Render one parsed panel to an SVG figure. */
function renderPanel(panel, idx) {
  const scene = CCSc.SCENES[panel.scene] || CCSc.SCENES.space;
  let inner = scene.art(idx);

  for (const cap of panel.captions) inner += CCS.caption(cap.text, cap.pos);

  const b = scene.bubble;
  panel.says.forEach((text, i) => {
    inner += CCS.speech(b.x, b.y + i * (b.h + 8), b.w, b.h, text, b.tail);
  });

  panel.sfx.forEach((text, i) => {
    inner += CCS.sfx(scene.sfx.x + i * 74, scene.sfx.y, text);
  });

  const wide = panel.wide || scene.wide;
  const unknown = !CCSc.SCENES[panel.scene]
    ? `<text x="12" y="290" class="cc-warn">unknown scene: ${CCS.escapeHtml(panel.scene)}</text>`
    : "";

  return (
    `<figure class="cc-panel${wide ? " wide" : ""}">` +
    `<svg viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice" class="cc-svg" ` +
    `xmlns="http://www.w3.org/2000/svg">${inner}${unknown}</svg>` +
    `<figcaption class="cc-num">${idx + 1}</figcaption></figure>`
  );
}

/** Render a whole parsed comic to an HTML string. */
function renderComic(comic) {
  const esc = CCS.escapeHtml;
  const title = esc(comic.title || "Untitled");
  const sub = comic.subtitle ? `<p>${esc(comic.subtitle)}</p>` : "";
  const splash = `<header class="cc-splash"><h1>${title}</h1>${sub}</header>`;

  if (!comic.panels.length) {
    return splash + `<p class="cc-empty">No panels yet. Add a <code>panel</code> to your script.</p>`;
  }
  const panels = comic.panels.map(renderPanel).join("");
  return splash + `<div class="cc-grid">${panels}</div>`;
}

const CCComic = { parseScript, renderPanel, renderComic };

if (typeof module !== "undefined" && module.exports) module.exports = CCComic;
if (typeof window !== "undefined") window.CCComic = CCComic;
