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
};

const CCScenes = { SCENES, list: Object.keys(SCENES) };

if (typeof module !== "undefined" && module.exports) module.exports = CCScenes;
if (typeof window !== "undefined") window.CCScenes = CCScenes;
