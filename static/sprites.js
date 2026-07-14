/*
 * Vector-art primitives for the comic. Each function returns a fragment of SVG
 * markup (no <svg> wrapper) positioned in a 440×300 panel coordinate space, so
 * scenes can compose them. Pure string builders — they run in the browser and
 * under `node --test`.
 */

// Small deterministic PRNG so a given seed always draws the same star field.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stars(seed, count, w = 440, h = 300) {
  const rnd = mulberry32(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = (rnd() * w).toFixed(1);
    const y = (rnd() * h).toFixed(1);
    const r = (rnd() * 1.3 + 0.3).toFixed(2);
    const o = (rnd() * 0.6 + 0.35).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  return out;
}

// A four-point sparkle star.
function twinkle(cx, cy, r, color = "#fff") {
  const a = r * 0.28;
  return (
    `<path d="M${cx} ${cy - r} L${cx + a} ${cy - a} L${cx + r} ${cy} ` +
    `L${cx + a} ${cy + a} L${cx} ${cy + r} L${cx - a} ${cy + a} ` +
    `L${cx - r} ${cy} L${cx - a} ${cy - a} Z" fill="${color}"/>`
  );
}

function planet(cx, cy, r, id, c1, c2) {
  return (
    `<defs><radialGradient id="${id}" cx="35%" cy="30%" r="85%">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</radialGradient></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`
  );
}

// A little satellite: body, two solar wings, a dish, and an antenna.
function probe(x, y, s = 1, tilt = 0) {
  return (
    `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})" ` +
    `stroke="#0b0f18" stroke-width="1.4" stroke-linejoin="round">` +
    `<rect x="-22" y="-3.5" width="14" height="7" fill="#5fb6f0"/>` +
    `<rect x="8" y="-3.5" width="14" height="7" fill="#5fb6f0"/>` +
    `<line x1="-8" y1="0" x2="-22" y2="0" stroke="#8fa0b5"/>` +
    `<line x1="8" y1="0" x2="22" y2="0" stroke="#8fa0b5"/>` +
    `<rect x="-8" y="-8" width="16" height="16" rx="2" fill="#d7dde6"/>` +
    `<circle cx="0" cy="-14" r="6" fill="#eef2f7"/>` +
    `<line x1="0" y1="-8" x2="0" y2="-11" stroke="#8fa0b5"/>` +
    `<line x1="6" y1="8" x2="12" y2="16" stroke="#8fa0b5"/>` +
    `<circle cx="12" cy="16" r="1.6" fill="#ffd15c" stroke="none"/>` +
    `</g>`
  );
}

// The ground and a hill for the Earth-side panels.
function hill(color = "#1c2a1e", w = 440, h = 300) {
  return `<path d="M0 ${h} L0 ${h - 60} Q${w * 0.4} ${h - 110} ${w} ${h - 70} L${w} ${h} Z" fill="${color}"/>`;
}

// A small child figure holding a homemade antenna toward the sky.
function kid(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="2" ` +
    `stroke-linecap="round" fill="none">` +
    `<circle cx="0" cy="-34" r="7" fill="#f2c9a0"/>` +
    `<line x1="0" y1="-27" x2="0" y2="-8"/>` +
    `<line x1="0" y1="-8" x2="-7" y2="6"/>` +
    `<line x1="0" y1="-8" x2="7" y2="6"/>` +
    `<line x1="0" y1="-22" x2="-10" y2="-8"/>` +
    `<line x1="0" y1="-22" x2="12" y2="-30"/>` +
    `<line x1="12" y1="-30" x2="14" y2="-52" stroke="#c9a24a"/>` +
    `<line x1="9" y1="-50" x2="19" y2="-54" stroke="#c9a24a"/>` +
    `<line x1="11" y1="-46" x2="17" y2="-48" stroke="#c9a24a"/>` +
    `</g>`
  );
}

// A beam of light between two points.
function beam(x1, y1, x2, y2, color = "#ffd15c") {
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ` +
    `stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round" opacity="0.85"/>`
  );
}

// Wrapped text via foreignObject — reliable wrapping without manual line math.
function textBox(x, y, w, h, cls, text) {
  return (
    `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="${cls}">${escapeHtml(text)}</div>` +
    `</foreignObject>`
  );
}

// A narration/caption box pinned to the top or bottom of a panel.
function caption(text, pos = "top") {
  const y = pos === "bottom" ? 258 : 8;
  return (
    `<rect x="8" y="${y}" width="424" height="34" rx="3" fill="#fdf3d8" ` +
    `stroke="#0b0f18" stroke-width="1.5"/>` +
    textBox(14, y + 3, 412, 30, "cc-caption", text)
  );
}

// A speech balloon with a tail pointing toward its speaker.
function speech(x, y, w, h, text, tail = "down") {
  const tails = {
    down: `M${x + w * 0.3} ${y + h} l10 14 l6 -14 Z`,
    left: `M${x} ${y + h * 0.6} l-14 8 l14 6 Z`,
    right: `M${x + w} ${y + h * 0.5} l14 8 l-14 6 Z`,
  };
  return (
    `<path d="${tails[tail] || tails.down}" fill="#fff" stroke="#0b0f18" stroke-width="1.5"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fff" ` +
    `stroke="#0b0f18" stroke-width="1.5"/>` +
    textBox(x + 6, y + 4, w - 12, h - 8, "cc-speech", text)
  );
}

// A jagged sound-effect burst.
function sfx(cx, cy, text, color = "#ffd15c") {
  return (
    `<g transform="translate(${cx} ${cy})">` +
    `<path d="M-34 0 L-24 -10 L-12 -4 L0 -16 L12 -4 L24 -12 L30 0 L22 10 L26 20 ` +
    `L10 16 L0 26 L-10 16 L-26 20 L-22 8 Z" fill="${color}" stroke="#0b0f18" stroke-width="1.5"/>` +
    `<text x="0" y="6" text-anchor="middle" class="cc-sfx">${escapeHtml(text)}</text>` +
    `</g>`
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CCSprites = {
  stars,
  twinkle,
  planet,
  probe,
  hill,
  kid,
  beam,
  caption,
  speech,
  sfx,
  textBox,
  escapeHtml,
};

if (typeof module !== "undefined" && module.exports) module.exports = CCSprites;
if (typeof window !== "undefined") window.CCSprites = CCSprites;
