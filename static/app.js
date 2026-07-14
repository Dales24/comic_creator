/*
 * The comic creator: a live editor. The writer types a script on the left; the
 * comic renders on the right on every keystroke and is saved to the browser.
 */
(() => {
  const STORAGE_KEY = "cc_script_v1";

  const DEFAULT_SCRIPT = `title: SIGNAL
subtitle: a very short story

panel
  scene: drift
  caption: For ninety-nine years, Probe-7 drifted with its ears open.

panel
  scene: listen
  sfx: blip
  caption: On the hundredth night, it heard something too regular to be a star.

panel
  scene: turn
  caption: So it turned toward a small blue world.

panel
  scene: earth-call
  say: Is anybody out there?

panel
  scene: reply
  sfx: click
  caption: Probe-7 had one light left. It spent it.

panel
  scene: answered
  say: ...hello.
  caption[bottom]: Across the dark, hello is the oldest word.
`;

  const editor = document.getElementById("script");
  const stage = document.getElementById("stage");
  const sceneList = document.getElementById("scene-list");

  editor.value = localStorage.getItem(STORAGE_KEY) || DEFAULT_SCRIPT;

  // Show the writer which scenes exist.
  sceneList.textContent = window.CCScenes.list.join(" · ");

  function render() {
    const comic = window.CCComic.parseScript(editor.value);
    stage.innerHTML = window.CCComic.renderComic(comic);
    localStorage.setItem(STORAGE_KEY, editor.value);
  }

  let timer = null;
  editor.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });

  document.getElementById("btn-reset").onclick = () => {
    if (confirm("Replace your script with the SIGNAL example?")) {
      editor.value = DEFAULT_SCRIPT;
      render();
    }
  };

  document.getElementById("btn-print").onclick = () => window.print();

  render();
})();
