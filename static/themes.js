/*
 * Art styles. Each theme restyles the comic two ways: CSS (fonts, borders,
 * page + balloon colours, floating decorations — see styles.css) and an SVG
 * filter applied to every panel's art for a painterly / cel-shaded / gothic
 * look. Pure data + string builders; runs in the browser and under node.
 */
const THEMES = [
  { id: "classic", label: "Classic" },
  { id: "burton", label: "Tim Burton" },
  { id: "potter", label: "Harry Potter" },
  { id: "vangogh", label: "Van Gogh" },
  { id: "princess", label: "Princess" },
  { id: "anime", label: "Anime" },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

// Hidden <svg> holding one <filter> per painterly theme. Injected once into the
// page; panels reference these by url(#ccf-<id>).
function filterDefs() {
  return (
    `<svg class="cc-filter-defs" width="0" height="0" aria-hidden="true">` +
    `<defs>` +
    // Tim Burton — desaturated, high-contrast, faintly wobbly and moody.
    `<filter id="ccf-burton">` +
    `<feColorMatrix type="saturate" values="0.3"/>` +
    `<feComponentTransfer>` +
    `<feFuncR type="gamma" amplitude="1.25" exponent="1.5" offset="-0.04"/>` +
    `<feFuncG type="gamma" amplitude="1.2" exponent="1.5" offset="-0.04"/>` +
    `<feFuncB type="gamma" amplitude="1.3" exponent="1.35" offset="0.01"/>` +
    `</feComponentTransfer>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="1" seed="7" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="4"/>` +
    `</filter>` +
    // Harry Potter — warm sepia parchment.
    `<filter id="ccf-potter">` +
    `<feColorMatrix type="matrix" values="0.5 0.5 0.2 0 0  0.35 0.55 0.2 0 0  0.25 0.4 0.25 0 0  0 0 0 1 0"/>` +
    `<feComponentTransfer><feFuncR type="gamma" amplitude="1.05" exponent="0.9" offset="0.03"/></feComponentTransfer>` +
    `</filter>` +
    // Van Gogh — swirling, painterly displacement with punchy colour.
    `<filter id="ccf-vangogh">` +
    `<feColorMatrix type="saturate" values="1.5"/>` +
    `<feTurbulence type="turbulence" baseFrequency="0.02 0.032" numOctaves="2" seed="4" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="9"/>` +
    `<feGaussianBlur stdDeviation="0.4"/>` +
    `</filter>` +
    // Princess — dreamy pink bloom.
    `<filter id="ccf-princess">` +
    `<feColorMatrix type="matrix" values="1 0 0.12 0 0.03  0 0.9 0.12 0 0.02  0.06 0 1 0 0.05  0 0 0 1 0"/>` +
    `<feGaussianBlur stdDeviation="1.1" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>` +
    // Anime — cel-shaded: posterized channels, high saturation.
    `<filter id="ccf-anime">` +
    `<feColorMatrix type="saturate" values="1.55"/>` +
    `<feComponentTransfer>` +
    `<feFuncR type="discrete" tableValues="0.12 0.36 0.6 0.82 1"/>` +
    `<feFuncG type="discrete" tableValues="0.12 0.36 0.6 0.82 1"/>` +
    `<feFuncB type="discrete" tableValues="0.12 0.36 0.6 0.82 1"/>` +
    `</feComponentTransfer>` +
    `</filter>` +
    `</defs></svg>`
  );
}

// The SVG filter id for a theme, or null for the un-filtered classic look.
function filterId(theme) {
  return theme && theme !== "classic" && THEME_IDS.has(theme) ? `ccf-${theme}` : null;
}

const CCThemes = { THEMES, THEME_IDS, filterDefs, filterId };

if (typeof module !== "undefined" && module.exports) module.exports = CCThemes;
if (typeof window !== "undefined") window.CCThemes = CCThemes;
