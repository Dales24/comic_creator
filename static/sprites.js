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

// ── First-year (baby) primitives ────────────────────────────────────────────
// A heart.
function heart(cx, cy, r, color = "#ff6ea8") {
  return (
    `<path d="M${cx} ${cy + r * 0.9} C ${cx - r * 1.5} ${cy - r * 0.2}, ` +
    `${cx - r * 0.55} ${cy - r * 1.15}, ${cx} ${cy - r * 0.35} C ` +
    `${cx + r * 0.55} ${cy - r * 1.15}, ${cx + r * 1.5} ${cy - r * 0.2}, ` +
    `${cx} ${cy + r * 0.9} Z" fill="${color}"/>`
  );
}

// A swaddled baby with a big round head. mood: "smile" | "sleep".
function baby(x, y, s = 1, mood = "smile") {
  const eyes =
    mood === "sleep"
      ? `<path d="M-11 -2 q3 3 6 0" fill="none" stroke="#2a2018" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M5 -2 q3 3 6 0" fill="none" stroke="#2a2018" stroke-width="2" stroke-linecap="round"/>`
      : `<circle cx="-8" cy="-2" r="2.6" fill="#2a2018"/><circle cx="8" cy="-2" r="2.6" fill="#2a2018"/>`;
  const mouth =
    mood === "sleep"
      ? `<circle cx="0" cy="9" r="2.4" fill="#c65f7a"/>`
      : `<path d="M-7 8 q7 8 14 0" fill="none" stroke="#2a2018" stroke-width="2" stroke-linecap="round"/>`;
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    `<path d="M-27 46 Q0 8 27 46 Q0 62 -27 46 Z" fill="#ffd9ec" stroke="#0b0f18" stroke-width="1.5"/>` +
    `<circle cx="0" cy="0" r="24" fill="#ffe0c2" stroke="#0b0f18" stroke-width="1.5"/>` +
    `<path d="M-5 -22 q7 -11 13 -2" fill="none" stroke="#8a5a3b" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="-12" cy="6" r="4" fill="#ffb3c6" opacity="0.85"/>` +
    `<circle cx="12" cy="6" r="4" fill="#ffb3c6" opacity="0.85"/>` +
    eyes +
    mouth +
    `</g>`
  );
}

// A crib with side bars and a heart on the headboard.
function crib(x, y, s = 1) {
  let bars = "";
  for (let i = 0; i <= 8; i++) bars += `<line x1="${-58 + i * 14.5}" y1="-18" x2="${-58 + i * 14.5}" y2="18"/>`;
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#7a5a3c" stroke-width="3" ` +
    `stroke-linecap="round">` +
    `<rect x="-64" y="18" width="128" height="10" rx="3" fill="#a67c52"/>` +
    `<line x1="-60" y1="-30" x2="-60" y2="28"/><line x1="60" y1="-30" x2="60" y2="28"/>` +
    `<line x1="-64" y1="-18" x2="64" y2="-18"/>` +
    bars +
    `<path d="M0 -34 l6 8 -6 6 -6 -6 Z" fill="#ff8fb3" stroke="none"/>` +
    `</g>`
  );
}

// A birthday cake with `candles` lit candles.
function cake(x, y, s = 1, candles = 1) {
  let flames = "";
  const span = (candles - 1) * 14;
  for (let i = 0; i < candles; i++) {
    const cx = -span / 2 + i * 14;
    flames +=
      `<rect x="${cx - 2}" y="-40" width="4" height="16" fill="#ffe08a" stroke="#0b0f18" stroke-width="1"/>` +
      `<path d="M${cx} -52 q5 6 0 12 q-5 -6 0 -12 Z" fill="#ffb347"/>`;
  }
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.5">` +
    `<rect x="-46" y="-24" width="92" height="34" rx="4" fill="#ffd9ec"/>` +
    `<path d="M-46 -24 q11 12 23 0 q11 12 23 0 q11 12 23 0" fill="#fff3f8"/>` +
    `<rect x="-52" y="8" width="104" height="16" rx="4" fill="#c98ad1"/>` +
    flames +
    `</g>`
  );
}

// A balloon on a string.
function balloon(x, y, color = "#ff6ea8", s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    `<path d="M0 34 q-6 -8 0 -12" fill="none" stroke="#b9c3d6" stroke-width="1.2"/>` +
    `<ellipse cx="0" cy="0" rx="16" ry="20" fill="${color}" stroke="#0b0f18" stroke-width="1.2"/>` +
    `<path d="M0 20 l4 6 -8 0 Z" fill="${color}" stroke="#0b0f18" stroke-width="1.2"/>` +
    `<ellipse cx="-5" cy="-7" rx="4" ry="6" fill="#fff" opacity="0.4"/>` +
    `</g>`
  );
}

// A sun with rays.
function sun(cx, cy, r = 22, color = "#ffd15c") {
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = (cx + Math.cos(a) * (r + 5)).toFixed(1);
    const y1 = (cy + Math.sin(a) * (r + 5)).toFixed(1);
    const x2 = (cx + Math.cos(a) * (r + 14)).toFixed(1);
    const y2 = (cy + Math.sin(a) * (r + 14)).toFixed(1);
    rays += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  }
  return rays + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
}

// A crescent moon.
function moon(cx, cy, r = 20, color = "#fdf0c0") {
  return (
    `<path d="M${cx + r * 0.4} ${cy - r} a ${r} ${r} 0 1 0 0 ${2 * r} ` +
    `a ${r * 0.8} ${r * 0.8} 0 1 1 0 ${-2 * r} Z" fill="${color}"/>`
  );
}

// A fluffy cloud.
function cloud(x, y, s = 1, color = "#ffffff") {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">` +
    `<ellipse cx="0" cy="0" rx="26" ry="16"/><ellipse cx="-20" cy="4" rx="16" ry="12"/>` +
    `<ellipse cx="20" cy="4" rx="18" ry="12"/><rect x="-34" y="2" width="70" height="12" rx="6"/>` +
    `</g>`
  );
}

// A baby bottle.
function bottle(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.3">` +
    `<rect x="-9" y="-6" width="18" height="34" rx="7" fill="#eaf3ff"/>` +
    `<rect x="-9" y="10" width="18" height="18" rx="7" fill="#cfe4ff"/>` +
    `<rect x="-7" y="-12" width="14" height="8" rx="3" fill="#ffd9ec"/>` +
    `<path d="M-3 -12 q3 -8 6 0 Z" fill="#ffb3c6"/>` +
    `</g>`
  );
}

// A simple flower.
function flower(x, y, s = 1, color = "#ff8fb3") {
  let petals = "";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    petals += `<circle cx="${(Math.cos(a) * 8).toFixed(1)}" cy="${(Math.sin(a) * 8).toFixed(1)}" r="6" fill="${color}"/>`;
  }
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    `<line x1="0" y1="0" x2="0" y2="26" stroke="#3f7a3f" stroke-width="3"/>` +
    petals +
    `<circle cx="0" cy="0" r="5" fill="#ffe08a"/></g>`
  );
}

// Stacked ABC blocks.
function blocks(x, y, s = 1) {
  const cols = ["#ff8fb3", "#7ec8ff", "#8ee6a0", "#ffd15c"];
  const cube = (bx, by, c, ch) =>
    `<rect x="${bx}" y="${by}" width="26" height="26" rx="4" fill="${c}" stroke="#0b0f18" stroke-width="1.4"/>` +
    `<text x="${bx + 13}" y="${by + 19}" text-anchor="middle" font-size="15" font-weight="800" fill="#0b0f18">${ch}</text>`;
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    cube(-14, -26, cols[0], "A") +
    cube(14, -26, cols[1], "B") +
    cube(0, 0, cols[2], "C") +
    `</g>`
  );
}

// An open picture book.
function book(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.4">` +
    `<path d="M0 0 L-34 -6 L-34 22 L0 28 Z" fill="#ffe0c2"/>` +
    `<path d="M0 0 L34 -6 L34 22 L0 28 Z" fill="#fff3f8"/>` +
    `<line x1="-26" y1="4" x2="-8" y2="7" stroke="#c98ad1"/><line x1="-26" y1="11" x2="-8" y2="14" stroke="#c98ad1"/>` +
    `<line x1="8" y1="7" x2="26" y2="4" stroke="#7ec8ff"/><line x1="8" y1="14" x2="26" y2="11" stroke="#7ec8ff"/>` +
    `</g>`
  );
}

// A sandcastle with a flag.
function sandcastle(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.3" fill="#e8c07a">` +
    `<rect x="-34" y="0" width="68" height="26"/>` +
    `<rect x="-34" y="-14" width="14" height="14"/><rect x="-7" y="-18" width="14" height="18"/><rect x="20" y="-14" width="14" height="14"/>` +
    `<line x1="0" y1="-18" x2="0" y2="-40" stroke="#0b0f18"/><path d="M0 -40 l14 5 -14 5 Z" fill="#ff6ea8" stroke="none"/>` +
    `</g>`
  );
}

// A snowman.
function snowman(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#8fa8c0" stroke-width="1.2" fill="#fff">` +
    `<circle cx="0" cy="0" r="20"/><circle cx="0" cy="-26" r="14"/>` +
    `<circle cx="-5" cy="-28" r="1.8" fill="#0b0f18"/><circle cx="5" cy="-28" r="1.8" fill="#0b0f18"/>` +
    `<path d="M0 -24 l10 3 -10 3 Z" fill="#ff8a3d" stroke="none"/>` +
    `<rect x="-11" y="-44" width="22" height="6" fill="#2a2018" stroke="none"/><rect x="-7" y="-56" width="14" height="14" fill="#2a2018" stroke="none"/>` +
    `<circle cx="0" cy="-4" r="2" fill="#0b0f18" stroke="none"/><circle cx="0" cy="4" r="2" fill="#0b0f18" stroke="none"/>` +
    `</g>`
  );
}

// A friendly sitting dog.
function dog(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.4" fill="#c9955c">` +
    `<ellipse cx="0" cy="6" rx="18" ry="14"/>` +
    `<circle cx="16" cy="-8" r="12"/>` +
    `<path d="M8 -16 l-4 -10 8 4 Z"/><path d="M24 -16 l4 -10 -8 4 Z"/>` +
    `<circle cx="13" cy="-9" r="1.6" fill="#0b0f18" stroke="none"/><circle cx="20" cy="-9" r="1.6" fill="#0b0f18" stroke="none"/>` +
    `<circle cx="22" cy="-3" r="2.4" fill="#0b0f18" stroke="none"/>` +
    `<path d="M-14 4 q-12 -6 -6 8" fill="none"/>` +
    `</g>`
  );
}

// A little decorated tree (holidays).
function tree(x, y, s = 1) {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" stroke="#0b0f18" stroke-width="1.2">` +
    `<rect x="-6" y="18" width="12" height="12" fill="#7a5a3c"/>` +
    `<path d="M0 -44 L22 -6 L-22 -6 Z" fill="#3f8f5a"/><path d="M0 -26 L26 18 L-26 18 Z" fill="#4aa065"/>` +
    twinkle(0, -46, 6, "#ffd15c") +
    `<circle cx="-10" cy="2" r="3" fill="#ff6ea8" stroke="none"/><circle cx="9" cy="8" r="3" fill="#7ec8ff" stroke="none"/><circle cx="0" cy="-8" r="3" fill="#ffd15c" stroke="none"/>` +
    `</g>`
  );
}

// ── Uploaded images (custom scenes + people) ────────────────────────────────
// Escape a value for an SVG attribute (data: URLs are long but safe to inline).
function attr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// A full-panel background from an uploaded image.
function photoBackground(href) {
  return (
    `<image href="${attr(href)}" x="0" y="0" width="440" height="300" ` +
    `preserveAspectRatio="xMidYMid slice" class="cc-kb"/>`
  );
}

// A round "sticker" cutout of an uploaded photo — a person dropped into the
// scene. `id` must be unique per panel so the clip paths don't collide.
function photoCutout(cx, cy, r, href, id) {
  return (
    `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
    `<image href="${attr(href)}" x="${cx - r}" y="${cy - r}" width="${2 * r}" ` +
    `height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="4"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#0b0f18" stroke-width="1.5"/>`
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
  heart,
  baby,
  crib,
  cake,
  balloon,
  sun,
  moon,
  cloud,
  bottle,
  flower,
  blocks,
  book,
  sandcastle,
  snowman,
  dog,
  tree,
  attr,
  photoBackground,
  photoCutout,
};

if (typeof module !== "undefined" && module.exports) module.exports = CCSprites;
if (typeof window !== "undefined") window.CCSprites = CCSprites;
