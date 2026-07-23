/*
 * Scene library: the palette a writer picks from. Each scene composes the
 * sprite primitives into a full 440×300 panel background, and declares where
 * speech balloons and sound effects should anchor. The writer supplies the
 * words; the scene supplies the picture. Runs in browser and node.
 */
const CC = typeof require !== "undefined" ? require("./sprites.js") : window.CCSprites;

function bg(idx, top, bottom) {
  return (
    `<defs><linearGradient id="bg${idx}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/>` +
    `</linearGradient></defs>` +
    `<rect width="440" height="300" fill="url(#bg${idx})"/>`
  );
}

// Anchors reused across space scenes.
const TOP_BUBBLE = { x: 20, y: 18, w: 200, h: 44, tail: "down" };
// Anchor reused across first-year scenes (balloon points down-left to a baby).
const SIDE_BUBBLE = { x: 214, y: 22, w: 200, h: 46, tail: "left" };

// A soft pastel room: wall gradient, floor band, and a sun of light.
function room(idx, top, bottom, floor) {
  return (
    bg(idx, top, bottom) +
    `<rect x="0" y="234" width="440" height="66" fill="${floor}"/>` +
    `<rect x="0" y="230" width="440" height="6" fill="rgba(0,0,0,0.08)"/>`
  );
}

// A daytime sky with a soft gradient.
function sky(idx, top, bottom) {
  return bg(idx, top, bottom);
}

const SCENES = {
  space: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 350, y: 130 },
    art: (i) =>
      bg(i, "#0a0f1e", "#141b30") +
      CC.stars(11 + i, 90) +
      CC.planet(360, 70, 26, `p${i}`, "#6fa8ff", "#22407a"),
  },

  drift: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 320, y: 120 },
    art: (i) =>
      bg(i, "#080c18", "#121a2e") +
      CC.stars(3 + i, 100) +
      CC.planet(372, 66, 24, `p${i}`, "#6fa8ff", "#213f78") +
      CC.twinkle(90, 210, 3) +
      CC.twinkle(250, 60, 2.4) +
      CC.probe(160, 175, 1, -8),
  },

  listen: {
    wide: false,
    bubble: { x: 18, y: 18, w: 190, h: 44, tail: "down" },
    sfx: { x: 330, y: 108 },
    art: (i) =>
      bg(i, "#0a0f1e", "#151d33") +
      CC.stars(7 + i, 80) +
      CC.probe(175, 160, 1.8, 0) +
      CC.twinkle(330, 108, 4, "#8effc0"),
  },

  turn: {
    wide: false,
    bubble: { x: 18, y: 18, w: 210, h: 44, tail: "down" },
    sfx: { x: 130, y: 90 },
    art: (i) =>
      bg(i, "#0a0f1e", "#101830") +
      CC.stars(13 + i, 70) +
      CC.planet(360, 258, 92, `p${i}`, "#7fb6ff", "#1f3f7a") +
      CC.probe(135, 120, 1.2, 22),
  },

  "earth-call": {
    wide: false,
    bubble: { x: 210, y: 60, w: 200, h: 46, tail: "left" },
    sfx: { x: 90, y: 80 },
    art: (i) =>
      bg(i, "#0b1226", "#20304a") +
      CC.stars(21 + i, 55, 440, 200) +
      CC.planet(70, 58, 20, `p${i}`, "#fdf0c0", "#caa64e") +
      CC.hill("#182617") +
      CC.kid(205, 250, 1.6),
  },

  reply: {
    wide: false,
    bubble: { x: 18, y: 18, w: 190, h: 44, tail: "down" },
    sfx: { x: 300, y: 90 },
    art: (i) =>
      bg(i, "#0a0f1e", "#151d33") +
      CC.stars(31 + i, 80) +
      CC.beam(205, 150, 40, 40) +
      CC.probe(210, 150, 1.6, -6),
  },

  answered: {
    wide: true,
    bubble: { x: 205, y: 150, w: 200, h: 46, tail: "left" },
    sfx: { x: 340, y: 70 },
    art: (i) =>
      bg(i, "#0c1428", "#243652") +
      CC.stars(41 + i, 60, 440, 200) +
      CC.twinkle(340, 66, 9, "#fff4c0") +
      CC.twinkle(340, 66, 16, "#ffd15c").replace('fill="#ffd15c"', 'fill="#ffd15c" opacity="0.35"') +
      CC.hill("#152414") +
      CC.kid(170, 250, 1.6),
  },

  // ── First-year (baby) scenes ──────────────────────────────────────────────
  // A soft, neutral backdrop — good behind an uploaded photo cutout.
  studio: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 210 },
    art: (i) =>
      bg(i, "#fff2f8", "#ffe0ef") +
      `<g class="cc-float">${CC.heart(70, 80, 9, "#ffb3c6")}${CC.heart(372, 100, 8, "#ff8fb3")}${CC.twinkle(120, 220, 5, "#ffd884")}</g>`,
  },

  nursery: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 90 },
    art: (i) =>
      room(i, "#fbe7f2", "#f6d3e6", "#e8c8b0") +
      CC.moon(360, 70, 16) +
      `<g class="cc-tw">${CC.twinkle(320, 60, 4, "#ffd884")}${CC.twinkle(392, 96, 3, "#ffd884")}</g>` +
      CC.crib(210, 210, 1.15) +
      CC.baby(210, 196, 0.8),
  },

  "first-smile": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 210 },
    art: (i) =>
      bg(i, "#fff2f8", "#ffdff0") +
      `<g class="cc-float">${CC.heart(70, 80, 10, "#ff8fb3")}${CC.heart(370, 110, 8, "#ff6ea8")}${CC.heart(120, 220, 7, "#ffa6c6")}</g>` +
      CC.baby(220, 150, 2.6),
  },

  "bath-time": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 350, y: 120 },
    art: (i) =>
      room(i, "#e3f4ff", "#c9e8ff", "#bfe0f2") +
      `<g class="cc-float">${CC.twinkle(90, 90, 5, "#ffffff")}${CC.twinkle(360, 80, 4, "#ffffff")}</g>` +
      `<ellipse cx="220" cy="236" rx="120" ry="34" fill="#8fd0ff" stroke="#0b0f18" stroke-width="1.5"/>` +
      `<circle cx="180" cy="210" r="10" fill="#dff3ff" opacity="0.8"/>` +
      `<circle cx="266" cy="216" r="8" fill="#dff3ff" opacity="0.8"/>` +
      CC.baby(220, 196, 0.9),
  },

  "first-food": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 120, y: 110 },
    art: (i) =>
      room(i, "#fff6e0", "#ffe9bd", "#e8c89a") +
      CC.baby(180, 176, 1.2) +
      CC.bottle(320, 168, 1.2) +
      `<ellipse cx="180" cy="238" rx="70" ry="14" fill="#c98a52" opacity="0.5"/>`,
  },

  crawling: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 350, y: 210 },
    art: (i) =>
      room(i, "#eafbe7", "#cdeecb", "#bfe0b0") +
      CC.baby(180, 196, 1.15) +
      CC.balloon(360, 150, "#7ec8ff", 0.8) +
      `<circle cx="300" cy="238" r="12" fill="#ff8fb3" stroke="#0b0f18" stroke-width="1.4"/>`,
  },

  "first-steps": {
    wide: false,
    bubble: SIDE_BUBBLE,
    sfx: { x: 110, y: 110 },
    art: (i) =>
      room(i, "#fef3ff", "#f0d9ff", "#d9c3ef") +
      `<g class="cc-float">${CC.twinkle(90, 90, 6, "#ffd884")}${CC.twinkle(360, 120, 4, "#ffd884")}</g>` +
      CC.baby(150, 176, 1.25) +
      CC.heart(300, 150, 12, "#ff6ea8"),
  },

  "first-birthday": {
    wide: true,
    bubble: SIDE_BUBBLE,
    sfx: { x: 70, y: 80 },
    art: (i) =>
      room(i, "#fff0f6", "#ffe0ef", "#f0cfe0") +
      `<g class="cc-float">${CC.balloon(70, 120, "#ff6ea8", 1)}${CC.balloon(115, 150, "#ffd15c", 0.9)}${CC.balloon(372, 120, "#7ec8ff", 1)}${CC.balloon(330, 150, "#8ee6a0", 0.9)}</g>` +
      CC.cake(220, 210, 1.3, 1) +
      CC.heart(220, 70, 12, "#ff6ea8"),
  },

  "park-day": {
    wide: true,
    bubble: SIDE_BUBBLE,
    sfx: { x: 360, y: 90 },
    art: (i) =>
      sky(i, "#bfe9ff", "#e8f8ff") +
      CC.sun(70, 66, 24) +
      `<g class="cc-float">${CC.cloud(300, 70, 1)}${CC.cloud(180, 46, 0.7)}</g>` +
      CC.hill("#8fd08a") +
      CC.flower(90, 250, 1) +
      CC.flower(360, 256, 0.9, "#ffd15c") +
      CC.baby(220, 214, 1.1),
  },

  bedtime: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 210 },
    art: (i) =>
      room(i, "#20264a", "#2f2f5e", "#3a2f52") +
      CC.stars(60 + i, 40, 440, 210) +
      CC.moon(360, 70, 20) +
      CC.crib(210, 210, 1.15) +
      CC.baby(210, 196, 0.8, "sleep"),
  },

  family: {
    wide: true,
    bubble: SIDE_BUBBLE,
    sfx: { x: 70, y: 80 },
    art: (i) =>
      room(i, "#fff3e6", "#ffe6cf", "#e8c8a8") +
      `<g class="cc-float">${CC.heart(70, 80, 12, "#ff6ea8")}${CC.heart(372, 96, 10, "#ff8fb3")}</g>` +
      CC.kid(120, 250, 1.9) +
      CC.kid(320, 250, 1.9) +
      CC.baby(220, 214, 1),
  },

  // ── More first-year moments ────────────────────────────────────────────────
  newborn: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 210 },
    art: (i) =>
      bg(i, "#fff4ea", "#ffe6d6") +
      `<g class="cc-float">${CC.heart(80, 90, 9, "#ff8fb3")}${CC.heart(360, 110, 8, "#ff6ea8")}</g>` +
      CC.baby(220, 150, 2.4, "sleep"),
  },

  peekaboo: {
    wide: false,
    bubble: SIDE_BUBBLE,
    sfx: { x: 90, y: 90 },
    art: (i) =>
      bg(i, "#fff2f8", "#ffe0ef") +
      CC.baby(220, 160, 1.9) +
      `<g stroke="#0b0f18" stroke-width="1.5" fill="#ffe0c2">` +
      `<path d="M150 150 q-24 -6 -30 30 q30 8 42 -14 Z"/>` +
      `<path d="M290 150 q24 -6 30 30 q-30 8 -42 -14 Z"/></g>`,
  },

  "tummy-time": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 350, y: 210 },
    art: (i) =>
      room(i, "#eafff2", "#cdefdd", "#bfe0c6") +
      `<rect x="120" y="220" width="200" height="34" rx="8" fill="#ffd9ec" opacity="0.7"/>` +
      CC.baby(200, 210, 1.1) +
      `<circle cx="320" cy="232" r="12" fill="#7ec8ff" stroke="#0b0f18" stroke-width="1.4"/>`,
  },

  playtime: {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 90, y: 100 },
    art: (i) =>
      room(i, "#fff7e6", "#ffe9c2", "#e8cfa0") +
      CC.baby(150, 186, 1.15) +
      CC.blocks(320, 214, 1.1),
  },

  "story-time": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 100 },
    art: (i) =>
      room(i, "#f1ecff", "#ddd0ff", "#c9bde8") +
      `<g class="cc-float">${CC.twinkle(90, 90, 5, "#ffd884")}${CC.twinkle(360, 110, 4, "#ffd884")}</g>` +
      CC.baby(150, 190, 1.1) +
      CC.book(300, 210, 1.4),
  },

  "beach-day": {
    wide: true,
    bubble: SIDE_BUBBLE,
    sfx: { x: 360, y: 80 },
    art: (i) =>
      sky(i, "#bfe9ff", "#e8f8ff") +
      CC.sun(380, 60, 22) +
      `<g class="cc-float">${CC.cloud(120, 56, 0.8)}</g>` +
      `<rect x="0" y="180" width="440" height="50" fill="#6fc7e8"/>` +
      `<rect x="0" y="222" width="440" height="78" fill="#f2e0b0"/>` +
      CC.sandcastle(320, 236, 1.1) +
      CC.baby(150, 232, 1.1),
  },

  "snow-day": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 360, y: 90 },
    art: (i) =>
      bg(i, "#cfe0f2", "#e8f0f8") +
      CC.stars(80 + i, 40, 440, 260).replace(/opacity="[^"]+"/g, 'opacity="0.9"') +
      `<rect x="0" y="250" width="440" height="50" fill="#f4f8ff"/>` +
      CC.snowman(320, 236, 1) +
      CC.baby(150, 232, 1),
  },

  "pet-friend": {
    wide: false,
    bubble: TOP_BUBBLE,
    sfx: { x: 350, y: 210 },
    art: (i) =>
      room(i, "#fff3e6", "#ffe6cf", "#e8c8a8") +
      CC.baby(160, 200, 1.05) +
      CC.dog(300, 214, 1.2) +
      CC.heart(230, 150, 10, "#ff6ea8"),
  },

  holiday: {
    wide: true,
    bubble: SIDE_BUBBLE,
    sfx: { x: 360, y: 90 },
    art: (i) =>
      room(i, "#f6e9ef", "#e9d3df", "#d8b8c6") +
      `<g class="cc-float">${CC.twinkle(80, 70, 5, "#ffd884")}${CC.twinkle(360, 90, 4, "#ffd884")}</g>` +
      CC.tree(110, 220, 1.15) +
      CC.baby(300, 214, 1.05),
  },
};

// Grouped for the scene picker (order = a natural first-year arc).
const GROUPS = {
  "First year": [
    "studio", "nursery", "newborn", "first-smile", "peekaboo", "bath-time",
    "tummy-time", "first-food", "playtime", "story-time", "crawling",
    "first-steps", "pet-friend", "park-day", "beach-day", "snow-day",
    "first-birthday", "holiday", "bedtime", "family",
  ],
  "Space (SIGNAL)": [
    "space", "drift", "listen", "turn", "earth-call", "reply", "answered",
  ],
};

const CCScenes = { SCENES, list: Object.keys(SCENES), groups: GROUPS };

if (typeof module !== "undefined" && module.exports) module.exports = CCScenes;
if (typeof window !== "undefined") window.CCScenes = CCScenes;
