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
    cast: "cc_cast_v1",
    cartoon: "cc_cartoon_v1",
  };

  // Which uploaded photo plays each character role.
  const ROLES = [
    { id: "baby", label: "Baby" },
    { id: "parent1", label: "Parent 1" },
    { id: "parent2", label: "Parent 2" },
    { id: "pet", label: "Pet" },
  ];

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

  // Uploaded originals (raw, downscaled) are the source of truth and persist in
  // the browser. `images` is what the comic actually draws: the cartoonified
  // version when Cartoonify is on, else the original. Cartoons are cached in
  // memory (recomputed on load) so we don't bloat storage.
  let originals = {};
  try {
    originals = JSON.parse(localStorage.getItem(KEY.images) || "{}");
  } catch {
    originals = {};
  }
  const cartoons = {};
  let cartoonOn = localStorage.getItem(KEY.cartoon) !== "off";
  let images = {};

  // Casting: role → uploaded image name (baby/parent1/parent2/pet).
  let cast = {};
  try {
    cast = JSON.parse(localStorage.getItem(KEY.cast) || "{}");
  } catch {
    cast = {};
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

  function saveOriginals() {
    try {
      localStorage.setItem(KEY.images, JSON.stringify(originals));
    } catch {
      // Storage full — images stay for this session but won't persist.
    }
  }

  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  // In-place 3×3 box blur of a single-channel Float32 plane.
  function blur3(a, w, h) {
    const src = a.slice();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const o = y * w + x;
        a[o] =
          (src[o - w - 1] + src[o - w] + src[o - w + 1] +
            src[o - 1] + src[o] + src[o + 1] +
            src[o + w - 1] + src[o + w] + src[o + w + 1]) / 9;
      }
    }
  }

  // Turn a photo into a cartoon drawing: heavily smooth colour into flat cel
  // regions, flatten to a few bands with punched-up colour, then ink bold,
  // continuous outlines. Pure canvas — nothing leaves the browser.
  function cartoonify(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const n = w * h;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;

        // Grayscale for edges; blur once so lines follow real contours, not noise.
        const gray = new Float32Array(n);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
          gray[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        }
        blur3(gray, w, h);

        // Smooth colour into flat regions: three box-blur passes per channel,
        // so posterizing gives clean cel shapes instead of speckle.
        const ch = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
          ch[0][p] = d[i];
          ch[1][p] = d[i + 1];
          ch[2][p] = d[i + 2];
        }
        for (let pass = 0; pass < 3; pass++)
          for (let k = 0; k < 3; k++) blur3(ch[k], w, h);

        // Flatten to a few colour bands, with a saturation boost.
        const levels = 4;
        const step = 255 / (levels - 1);
        for (let p = 0; p < n; p++) {
          let r = ch[0][p], g = ch[1][p], b = ch[2][p];
          const avg = (r + g + b) / 3;
          r = avg + (r - avg) * 1.45;
          g = avg + (g - avg) * 1.45;
          b = avg + (b - avg) * 1.45;
          const i = p * 4;
          d[i] = Math.round(clamp255(r) / step) * step;
          d[i + 1] = Math.round(clamp255(g) / step) * step;
          d[i + 2] = Math.round(clamp255(b) / step) * step;
        }

        // Detect edges (Sobel on the blurred grayscale)...
        const edge = new Uint8Array(n);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const o = y * w + x;
            const gx =
              -gray[o - w - 1] - 2 * gray[o - 1] - gray[o + w - 1] +
              gray[o - w + 1] + 2 * gray[o + 1] + gray[o + w + 1];
            const gy =
              -gray[o - w - 1] - 2 * gray[o - w] - gray[o - w + 1] +
              gray[o + w - 1] + 2 * gray[o + w] + gray[o + w + 1];
            if (gx * gx + gy * gy > 2400) edge[o] = 1;
          }
        }
        // ...then thicken them (dilate 1px) so the ink reads as bold, unbroken lines.
        const ink = new Uint8Array(n);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const o = y * w + x;
            if (edge[o] || edge[o - 1] || edge[o + 1] || edge[o - w] || edge[o + w])
              ink[o] = 1;
          }
        }
        for (let p = 0; p < n; p++) {
          if (ink[p]) {
            const i = p * 4;
            d[i] = d[i + 1] = d[i + 2] = 18;
          }
        }

        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => resolve(dataURL); // fall back to the original
      img.src = dataURL;
    });
  }

  // Rebuild the render map from the originals (cartoonified or not).
  async function rebuildImages() {
    images = {};
    for (const name of Object.keys(originals)) {
      if (cartoonOn) {
        if (!cartoons[name]) cartoons[name] = await cartoonify(originals[name]);
        images[name] = cartoons[name];
      } else {
        images[name] = originals[name];
      }
    }
    renderLibrary();
    render();
  }

  function slug(s) {
    return (
      String(s).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
      "photo"
    );
  }

  function uniqueName(base) {
    if (!originals[base]) return base;
    let i = 2;
    while (originals[`${base}-${i}`]) i++;
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

  function saveCast() {
    try {
      localStorage.setItem(KEY.cast, JSON.stringify(cast));
    } catch {
      /* ignore */
    }
  }

  // The role an image is currently cast as, or "".
  function roleOf(name) {
    return ROLES.find((r) => cast[r.id] === name)?.id || "";
  }

  function castImage(name, role) {
    for (const r of ROLES) if (cast[r.id] === name) delete cast[r.id]; // one role max
    if (role) cast[role] = name; // takes the role from whoever had it
    saveCast();
    renderLibrary();
    render();
  }

  function renderLibrary() {
    photoList.innerHTML = "";
    const names = Object.keys(originals);
    if (!names.length) {
      photoList.innerHTML = `<span class="photos-empty">No images yet.</span>`;
      return;
    }
    for (const name of names) {
      const current = roleOf(name);
      const thumb = images[name] || originals[name];
      const options =
        `<option value="">Cast as…</option>` +
        ROLES.map(
          (r) => `<option value="${r.id}"${r.id === current ? " selected" : ""}>${r.label}</option>`
        ).join("");
      const card = document.createElement("div");
      card.className = "photo-card" + (current ? " cast" : "");
      card.innerHTML =
        `<img src="${thumb}" alt="${name}" />` +
        `<span class="photo-name" title="${name}">${name}</span>` +
        `<select class="cast-select" aria-label="Cast ${name}">${options}</select>` +
        `<div class="photo-actions">` +
        `<button data-act="person">Person</button>` +
        `<button data-act="scene">Scene</button>` +
        `<button data-act="del" class="del" title="Delete">×</button>` +
        `</div>`;
      card.querySelector(".cast-select").onchange = (e) => castImage(name, e.target.value);
      card.querySelector('[data-act="person"]').onclick = () =>
        insertText(`\npanel\n  scene: studio\n  photo: ${name}\n  caption: \n`);
      card.querySelector('[data-act="scene"]').onclick = () =>
        insertText(`\npanel\n  background: ${name}\n  caption: \n`);
      card.querySelector('[data-act="del"]').onclick = () => {
        delete originals[name];
        delete cartoons[name];
        delete images[name];
        for (const r of ROLES) if (cast[r.id] === name) delete cast[r.id];
        saveOriginals();
        saveCast();
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
        originals[uniqueName(slug(file.name))] = await downscale(file);
      } catch {
        /* skip unreadable file */
      }
    }
    fileInput.value = "";
    saveOriginals();
    await rebuildImages(); // cartoonify (if on) + re-render
  });

  const cartoonChk = document.getElementById("chk-cartoon");
  if (cartoonChk) {
    cartoonChk.checked = cartoonOn;
    cartoonChk.addEventListener("change", () => {
      cartoonOn = cartoonChk.checked;
      localStorage.setItem(KEY.cartoon, cartoonOn ? "on" : "off");
      rebuildImages();
    });
  }

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
    stage.innerHTML = window.CCComic.renderComic(comic, {
      theme, images, animate: animOn, cast,
    });
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
    const target = window.CCComic.lengthCount(lengthSel.value);
    const current = window.CCComic.parseScript(editor.value).panels.length;
    if (
      target < current &&
      !confirm(`Shorten to ${target} panels? This removes the last ${current - target}.`)
    ) {
      lengthSel.value = length; // revert
      return;
    }
    length = lengthSel.value;
    localStorage.setItem(KEY.length, length);
    editor.value = window.CCComic.resizeScript(editor.value, target);
    render();
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
  rebuildImages(); // cartoonify saved photos + fill the library, then re-render
})();
