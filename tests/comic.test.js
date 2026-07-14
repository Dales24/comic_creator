const test = require("node:test");
const assert = require("node:assert");
const { parseScript, renderPanel, renderComic } = require("../static/comic.js");
const { SCENES, list } = require("../static/scenes.js");
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
