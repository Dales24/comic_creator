/*
 * The comic creator: a live editor. The writer types a script on the left; the
 * comic renders on the right on every keystroke, styled by the chosen art
 * theme, and everything is saved to the browser.
 */
(() => {
  const KEY = {
    script: "cc_script_v1",
    theme: "cc_theme_v1",
    length: "cc_length_v1",
    anim: "cc_anim_v1",
    images: "cc_images_v1",
  };

  const SPACE_EXAMPLE = `title: SIGNAL
subtitle: a very short story

panel
  scene: drift
  caption: For ninety-nine years, Probe-7 drifted with its ears open.

panel
  scene: listen
  sfx: blip
  caption: On the hundredth night, it heard something too regular to be a star.

panel
  scene: earth-call
  say: Is anybody out there?

panel
  scene: answered
  say: ...hello.
  caption[bottom]: Across the dark, hello is the oldest word.
`;

  const editor = document.getElementById("script");
  const stage = document.getElementById("stage");
  const scenePicker = document.getElementById("scene-picker");
  const picker = document.getElementById("theme-picker");
  const lengthSel = document.getElementById("length");
  const animChk = document.getElementById("chk-anim");

  let theme = localStorage.getItem(KEY.theme) || "classic";
  let length = localStorage.getItem(KEY.length) || "medium";
  let animOn = localStorage.getItem(KEY.anim) !== "off";

  // Uploaded images: name → data URL. Persisted (downscaled) in the browser.
  let images = {};
  try {
    images = JSON.parse(localStorage.getItem(KEY.images) || "{}");
  } catch {
    images = {};
  }

  editor.value =
    localStorage.getItem(KEY.script) || window.CCComic.firstYearTemplate(length);
  lengthSel.value = length;
  animChk.checked = animOn;
  document.body.classList.toggle("no-anim", !animOn);

  // ── scene picker (insert a panel for the chosen scene) ───────────────────────
  for (const [group, names] of Object.entries(window.CCScenes.groups)) {
    const og = document.createElement("optgroup");
    og.label = group;
    for (const n of names) og.appendChild(new Option(n, n));
    scenePicker.appendChild(og);
  }

  function insertText(text) {
    const v = editor.value;
    const pos = typeof editor.selectionStart === "number" ? editor.selectionStart : v.length;
    editor.value = v.slice(0, pos) + text + v.slice(pos);
    const caret = pos + text.length;
    editor.focus();
    editor.setSelectionRange(caret, caret);
    render();
  }

  scenePicker.addEventListener("change", () => {
    if (scenePicker.value) {
      insertText(`\npanel\n  scene: ${scenePicker.value}\n  caption: \n`);
      scenePicker.value = "";
    }
  });

  // ── uploaded photos & scenes ─────────────────────────────────────────────────
  const fileInput = document.getElementById("file-input");
  const photoList = document.getElementById("photo-list");

  function saveImages() {
    try {
      localStorage.setItem(KEY.images, JSON.stringify(images));
    } catch {
      // Storage full — images stay for this session but won't persist.
    }
  }

  function slug(s) {
    return (
      String(s).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
      "photo"
    );
  }

  function uniqueName(base) {
    if (!images[base]) return base;
    let i = 2;
    while (images[`${base}-${i}`]) i++;
    return `${base}-${i}`;
  }

  // Downscale to keep localStorage small; returns a JPEG data URL.
  function downscale(file, maxDim = 640) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function renderLibrary() {
    photoList.innerHTML = "";
    const names = Object.keys(images);
    if (!names.length) {
      photoList.innerHTML = `<span class="photos-empty">No images yet.</span>`;
      return;
    }
    for (const name of names) {
      const card = document.createElement("div");
      card.className = "photo-card";
      card.innerHTML =
        `<img src="${images[name]}" alt="${name}" />` +
        `<span class="photo-name" title="${name}">${name}</span>` +
        `<div class="photo-actions">` +
        `<button data-act="person">Person</button>` +
        `<button data-act="scene">Scene</button>` +
        `<button data-act="del" class="del" title="Delete">×</button>` +
        `</div>`;
      card.querySelector('[data-act="person"]').onclick = () =>
        insertText(`\npanel\n  scene: studio\n  photo: ${name}\n  caption: \n`);
      card.querySelector('[data-act="scene"]').onclick = () =>
        insertText(`\npanel\n  background: ${name}\n  caption: \n`);
      card.querySelector('[data-act="del"]').onclick = () => {
        delete images[name];
        saveImages();
        renderLibrary();
        render();
      };
      photoList.appendChild(card);
    }
  }

  document.getElementById("btn-upload").onclick = () => fileInput.click();
  fileInput.addEventListener("change", async () => {
    for (const file of fileInput.files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        images[uniqueName(slug(file.name))] = await downscale(file);
      } catch {
        /* skip unreadable file */
      }
    }
    fileInput.value = "";
    saveImages();
    renderLibrary();
    render();
  });

  renderLibrary();

  // ── theme picker ────────────────────────────────────────────────────────────
  for (const t of window.CCThemes.THEMES) {
    const btn = document.createElement("button");
    btn.className = "theme-btn";
    btn.dataset.theme = t.id;
    btn.textContent = t.label;
    btn.addEventListener("click", () => setTheme(t.id));
    picker.appendChild(btn);
  }

  function markActiveTheme() {
    for (const btn of picker.querySelectorAll(".theme-btn")) {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    }
  }

  function setTheme(id) {
    theme = id;
    localStorage.setItem(KEY.theme, id);
    markActiveTheme();
    render();
  }

  // ── decorations (floating per-theme sparkle/hearts/bats) ─────────────────────
  const DECOR = {
    classic: [],
    burton: ["🦇", "🕸", "🌙", "🦇"],
    potter: ["✨", "⚡", "🪄", "✨"],
    vangogh: ["🌀", "✦", "🌻", "✦"],
    princess: ["💖", "👑", "💗", "🌸"],
    anime: ["✨", "🌸", "⭐", "💫"],
  };

  function mountDecor() {
    stage.querySelector(".cc-decor")?.remove();
    const glyphs = DECOR[theme] || [];
    if (!animOn || !glyphs.length) return;
    const layer = document.createElement("div");
    layer.className = "cc-decor";
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = glyphs[i % glyphs.length];
      s.style.left = Math.round((i * 61) % 100) + "%";
      s.style.fontSize = 12 + ((i * 7) % 16) + "px";
      s.style.animationDelay = ((i * 0.7) % 6).toFixed(2) + "s";
      s.style.animationDuration = 6 + ((i * 1.3) % 6) + "s";
      layer.appendChild(s);
    }
    stage.appendChild(layer);
  }

  // ── render ──────────────────────────────────────────────────────────────────
  function render() {
    const comic = window.CCComic.parseScript(editor.value);
    stage.innerHTML = window.CCComic.renderComic(comic, { theme, images });
    stage.dataset.theme = theme;
    // Stagger each panel's entrance animation.
    stage.querySelectorAll(".cc-panel").forEach((p, i) => {
      p.style.animationDelay = (i * 0.08).toFixed(2) + "s";
    });
    mountDecor();
    localStorage.setItem(KEY.script, editor.value);
  }

  let timer = null;
  editor.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150);
  });

  lengthSel.addEventListener("change", () => {
    length = lengthSel.value;
    localStorage.setItem(KEY.length, length);
  });

  animChk.addEventListener("change", () => {
    animOn = animChk.checked;
    localStorage.setItem(KEY.anim, animOn ? "on" : "off");
    document.body.classList.toggle("no-anim", !animOn);
    render();
  });

  document.getElementById("btn-story").onclick = () => {
    if (
      editor.value.trim() &&
      !confirm("Replace the script with a fresh first-year story?")
    )
      return;
    editor.value = window.CCComic.firstYearTemplate(length);
    render();
  };

  document.getElementById("btn-example").onclick = () => {
    if (editor.value.trim() && !confirm("Replace the script with the SIGNAL example?"))
      return;
    editor.value = SPACE_EXAMPLE;
    render();
  };

  document.getElementById("btn-print").onclick = () => window.print();

  markActiveTheme();
  render();
})();
