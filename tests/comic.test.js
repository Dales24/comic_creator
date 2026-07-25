const test = require("node:test");
const assert = require("node:assert");
const {
  parseScript,
  renderPanel,
  renderComic,
  firstYearTemplate,
  resizeScript,
} = require("../static/comic.js");
const { SCENES, list } = require("../static/scenes.js");
const themes = require("../static/themes.js");
const sprites = require("../static/sprites.js");

const SAMPLE = `title: SIGNAL
subtitle: a very short story

panel
  scene: listen
  sfx: blip
  caption: it heard something.

panel
  scene: answered
  say: ...hello.
  caption[bottom]: hello is the oldest word.
`;

test("parses title, subtitle, and panels", () => {
  const comic = parseScript(SAMPLE);
  assert.strictEqual(comic.title, "SIGNAL");
  assert.strictEqual(comic.subtitle, "a very short story");
  assert.strictEqual(comic.panels.length, 2);
});

test("parses panel fields including scene, sfx, say, captions", () => {
  const [p1, p2] = parseScript(SAMPLE).panels;
  assert.strictEqual(p1.scene, "listen");
  assert.deepStrictEqual(p1.sfx, ["blip"]);
  assert.deepStrictEqual(p1.captions, [{ text: "it heard something.", pos: "top" }]);
  assert.deepStrictEqual(p2.says, ["...hello."]);
  assert.strictEqual(p2.captions[0].pos, "bottom");
});

test("meta only counts before the first panel", () => {
  const comic = parseScript("title: A\npanel\ntitle: B\ncaption: hi");
  assert.strictEqual(comic.title, "A"); // second title is ignored inside a panel
});

test("blank lines and // comments are skipped", () => {
  const comic = parseScript("// a note\n\npanel\ncaption: x\n\n// end");
  assert.strictEqual(comic.panels.length, 1);
  assert.strictEqual(comic.panels[0].captions[0].text, "x");
});

test("renders an SVG panel containing the writer's words", () => {
  const svg = renderPanel(parseScript(SAMPLE).panels[0], 0);
  assert.ok(svg.includes("<svg"));
  assert.ok(svg.includes("it heard something."));
  assert.ok(svg.includes("blip"));
});

test("multiple say lines stack into separate bubbles", () => {
  const panel = parseScript("panel\nsay: one\nsay: two").panels[0];
  const svg = renderPanel(panel, 0);
  assert.ok(svg.includes("one"));
  assert.ok(svg.includes("two"));
});

test("an unknown scene falls back to space and warns", () => {
  const svg = renderPanel({ scene: "nope", captions: [], says: [], sfx: [] }, 0);
  assert.ok(svg.includes("unknown scene: nope"));
});

test("renderComic shows an empty-state when there are no panels", () => {
  assert.ok(renderComic({ title: "T", subtitle: "", panels: [] }).includes("No panels yet"));
});

test("every scene renders non-empty art with valid coordinates", () => {
  for (const name of list) {
    const art = SCENES[name].art(0);
    assert.ok(art.length > 0, `${name} produced no art`);
    assert.ok(!art.includes("NaN"), `${name} has NaN coordinates`);
  }
});

test("html is escaped so a script can't inject markup", () => {
  const svg = renderPanel(parseScript("panel\ncaption: <b>x</b>").panels[0], 0);
  assert.ok(svg.includes("&lt;b&gt;"));
  assert.ok(!svg.includes("<b>x</b>"));
});

test("sprites: stars are deterministic for a seed", () => {
  assert.strictEqual(sprites.stars(5, 10), sprites.stars(5, 10));
});

// ── first-year story + themes ────────────────────────────────────────────────
test("first-year scenes are registered", () => {
  for (const s of ["nursery", "first-smile", "first-birthday", "bedtime", "family"]) {
    assert.ok(list.includes(s), `${s} missing`);
  }
});

test("new scenes are registered and render", () => {
  const { SCENES } = require("../static/scenes.js");
  for (const s of ["newborn", "peekaboo", "beach-day", "snow-day", "pet-friend", "holiday"]) {
    assert.ok(SCENES[s], `${s} missing`);
    assert.ok(!SCENES[s].art(0).includes("NaN"), `${s} has NaN`);
  }
});

test("scene picker groups cover every scene exactly once", () => {
  const { groups, list: all } = require("../static/scenes.js");
  const grouped = Object.values(groups).flat();
  assert.strictEqual(grouped.length, all.length, "count mismatch");
  assert.deepStrictEqual([...grouped].sort(), [...all].sort());
});

// ── uploaded photos & custom scenes ───────────────────────────────────────────
test("studio scene is registered for photo cutouts", () => {
  assert.ok(list.includes("studio"));
});

test("parses photo and background directives with positions", () => {
  const p = parseScript(
    "panel\n  background: bg1\n  photo: her\n  photo[left]: dad"
  ).panels[0];
  assert.strictEqual(p.background, "bg1");
  assert.deepStrictEqual(p.photos, [
    { name: "her", pos: null }, // no option → placed on the scene's anchor
    { name: "dad", pos: "left" },
  ]);
});

test("renders an uploaded background image, styled by the theme", () => {
  const html = renderComic(parseScript("panel\n  background: bg1"), {
    theme: "vangogh",
    images: { bg1: "data:image/png;base64,AAA" },
  });
  assert.ok(html.includes("<image"), "no <image>");
  assert.ok(html.includes("data:image/png;base64,AAA"), "href missing");
  assert.ok(html.includes('filter="url(#ccf-vangogh-0)"'), "not themed");
});

test("renders an uploaded person as an animated (SMIL) clipped cutout", () => {
  const html = renderComic(parseScript("panel\n  scene: studio\n  photo: her"), {
    images: { her: "data:image/png;base64,BBB" },
  });
  assert.ok(html.includes("<clipPath"), "no clip");
  assert.ok(html.includes("<animateTransform"), "not animated");
  assert.ok(html.includes("data:image/png;base64,BBB"), "href missing");
});

test("animate:false renders photos without motion", () => {
  const html = renderComic(parseScript("panel\n  scene: studio\n  photo: her"), {
    images: { her: "data:image/png;base64,BBB" },
    animate: false,
  });
  assert.ok(html.includes("data:image/png;base64,BBB"), "photo missing");
  assert.ok(!html.includes("<animateTransform"), "should have no motion");
});

test("a photo lands on the scene's own person anchor", () => {
  const { personAnchor } = require("../static/scenes.js");
  const a = personAnchor("nursery"); // in the crib, smaller
  const html = renderComic(parseScript("panel\n  scene: nursery\n  photo: her"), {
    images: { her: "data:image/png;base64,AAA" },
  });
  assert.ok(html.includes(`cx="${a.x}" cy="${a.y}" r="${a.r}"`), "not on the anchor");
});

test("photo[left] forces a corner instead of the scene anchor", () => {
  const html = renderComic(parseScript("panel\n  scene: nursery\n  photo[left]: her"), {
    images: { her: "data:image/png;base64,AAA" },
  });
  assert.ok(html.includes('cx="128"'), "did not use the left corner");
});

test("a scene draws its cartoon figures by default", () => {
  const html = renderComic(parseScript("panel\n  scene: nursery"), {});
  assert.ok(html.includes("#ffe0c2"), "cartoon baby not drawn"); // baby head fill
});

test("casting a photo to a role replaces the cartoon with the animated photo", () => {
  const html = renderComic(parseScript("panel\n  scene: nursery"), {
    images: { ava: "data:image/png;base64,AVA" },
    cast: { baby: "ava" },
  });
  assert.ok(html.includes("data:image/png;base64,AVA"), "photo not used");
  assert.ok(html.includes("<clipPath"), "photo not a cutout");
  assert.ok(html.includes("<animateTransform"), "photo not animated");
  assert.ok(!html.includes("#ffe0c2"), "cartoon baby still drawn");
});

test("the family scene casts parents and baby independently", () => {
  const html = renderComic(parseScript("panel\n  scene: family"), {
    images: { mom: "data:image/png;base64,MOM", dad: "data:image/png;base64,DAD" },
    cast: { parent1: "mom", parent2: "dad" },
  });
  assert.ok(html.includes("data:image/png;base64,MOM"), "parent1 not cast");
  assert.ok(html.includes("data:image/png;base64,DAD"), "parent2 not cast");
});

test("a scene with no figures (space) is unaffected by casting", () => {
  const html = renderComic(parseScript("panel\n  scene: space"), {
    images: { ava: "data:x" },
    cast: { baby: "ava" },
  });
  assert.ok(!html.includes("data:x"));
});

test("a missing uploaded image name warns instead of breaking", () => {
  const html = renderComic(parseScript("panel\n  background: nope"), { images: {} });
  assert.ok(html.includes("missing image: nope"));
});

test("photo hrefs are attribute-escaped", () => {
  const html = renderComic(parseScript("panel\n  background: b"), {
    images: { b: 'data:image/png;base64,x"onload="evil' },
  });
  assert.ok(!html.includes('"onload="evil'), "unescaped quote in href");
  assert.ok(html.includes("&quot;onload=&quot;evil"));
});

test("firstYearTemplate builds a parseable story of the chosen length", () => {
  for (const [len, n] of [
    ["short", 4],
    ["medium", 7],
    ["long", 10],
  ]) {
    const comic = parseScript(firstYearTemplate(len));
    assert.strictEqual(comic.panels.length, n, `${len} length`);
    assert.ok(comic.title.length > 0);
    // Every generated panel references a real scene.
    for (const p of comic.panels) assert.ok(SCENES[p.scene], `unknown scene ${p.scene}`);
  }
});

test("firstYearTemplate name flows into the title", () => {
  assert.ok(parseScript(firstYearTemplate("short", "Ava")).title.startsWith("Ava"));
});

test("resizeScript trims to fewer panels, keeping the first ones + title", () => {
  const script = firstYearTemplate("long"); // 10 panels
  const c = parseScript(resizeScript(script, 4));
  assert.strictEqual(c.panels.length, 4);
  assert.strictEqual(c.panels[0].scene, parseScript(script).panels[0].scene);
  assert.ok(c.title.length > 0, "title lost");
});

test("resizeScript extends to more panels", () => {
  const c = parseScript(resizeScript(firstYearTemplate("short"), 8)); // 4 → 8
  assert.strictEqual(c.panels.length, 8);
});

test("resizeScript preserves edited captions on the panels it keeps", () => {
  const script =
    "title: X\npanel\n  scene: nursery\n  caption: MY WORDS\npanel\n  scene: family\n  caption: bye";
  const c = parseScript(resizeScript(script, 1));
  assert.strictEqual(c.panels.length, 1);
  assert.strictEqual(c.panels[0].captions[0].text, "MY WORDS");
});

test("a theme puts a per-panel SVG filter (defs + reference) in each panel", () => {
  const html = renderComic(parseScript("panel\n  scene: nursery"), { theme: "vangogh" });
  // The filter is defined and referenced by a panel-unique id in the same <svg>.
  assert.ok(html.includes('<filter id="ccf-vangogh-0">'), "filter def missing");
  assert.ok(html.includes('filter="url(#ccf-vangogh-0)"'), "art not filtered");
});

test("classic theme applies no filter to the art", () => {
  const html = renderComic(parseScript("panel\n  scene: nursery"), { theme: "classic" });
  assert.ok(!html.includes('filter="url(#ccf'));
  assert.ok(!html.includes("<filter"));
});

test("themes expose per-theme filters; classic has none", () => {
  assert.ok(themes.hasFilter("burton"));
  assert.ok(!themes.hasFilter("classic"));
  assert.ok(!themes.hasFilter("nope"));
  assert.strictEqual(themes.THEMES.length, 6);
  assert.ok(themes.filterMarkup("princess", "x").includes('<filter id="x">'));
  assert.strictEqual(themes.filterMarkup("classic", "x"), "");
});
