(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    scrollableRelated: true,
    enhancedTheater: true,
    theaterMode: "viewport",
    protectControls: true,
    hidePauseOverlay: true
  };

  const THEATER_HINTS = {
    viewport: "Fills the viewport width & height below the top search bar.",
    cinematic: "Expands to 85% viewport height, keeping the video title visible.",
    fullbleed: "Fills 100% of the window; hover the top edge to reveal the header."
  };

  const storageArea =
    typeof chrome !== "undefined" && chrome.storage
      ? chrome.storage.sync || chrome.storage.local
      : null;

  const els = {
    scrollableRelated: document.getElementById("scrollableRelated"),
    enhancedTheater: document.getElementById("enhancedTheater"),
    protectControls: document.getElementById("protectControls"),
    hidePauseOverlay: document.getElementById("hidePauseOverlay"),
    theaterModeWrapper: document.getElementById("theaterModeWrapper"),
    theaterHint: document.getElementById("theaterHint"),
    segButtons: Array.from(document.querySelectorAll(".seg-btn")),
    resetBtn: document.getElementById("resetBtn"),
    thumbContent: document.getElementById("thumbContent"),
    thumbEmpty: document.getElementById("thumbEmpty"),
    thumbPreview: document.getElementById("thumbPreview"),
    thumbRes: document.getElementById("thumbRes"),
    openThumbBtn: document.getElementById("openThumbBtn")
  };

  let state = { ...DEFAULT_SETTINGS };
  let activeThumbUrl = null;

  function extractVideoId(rawUrl) {
    if (!rawUrl) return null;
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || null;
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        if (url.pathname === "/watch") {
          return url.searchParams.get("v");
        }
        const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?#]+)/);
        if (match) return match[1];
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function probeThumbnail(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 120) {
          resolve({ ok: true, width: img.naturalWidth, height: img.naturalHeight, url });
        } else {
          resolve({ ok: false });
        }
      };
      img.onerror = () => resolve({ ok: false });
      img.src = url;
    });
  }

  async function loadThumbnailPreview() {
    if (typeof chrome === "undefined" || !chrome.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
      const activeTab = tabs && tabs[0];
      const videoId = extractVideoId(activeTab && activeTab.url);

      if (!videoId) {
        els.thumbContent.hidden = true;
        els.thumbRes.hidden = true;
        els.thumbEmpty.hidden = false;
        return;
      }

      const candidates = [
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      ];

      let best = {
        url: candidates[candidates.length - 1],
        width: 480,
        height: 360
      };

      for (const candidate of candidates) {
        const result = await probeThumbnail(candidate);
        if (result.ok) {
          best = result;
          break;
        }
      }

      activeThumbUrl = best.url;
      els.thumbPreview.src = best.url;
      els.thumbRes.textContent = `${best.width} × ${best.height}`;
      els.thumbRes.hidden = false;
      els.thumbContent.hidden = false;
      els.thumbEmpty.hidden = true;
    });
  }

  function render() {
    els.scrollableRelated.checked = Boolean(state.scrollableRelated);
    els.enhancedTheater.checked = Boolean(state.enhancedTheater);
    els.protectControls.checked = Boolean(state.protectControls);
    els.hidePauseOverlay.checked = Boolean(state.hidePauseOverlay);

    els.theaterModeWrapper.classList.toggle("disabled", !state.enhancedTheater);

    for (const btn of els.segButtons) {
      const isActive = btn.dataset.mode === state.theaterMode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-checked", String(isActive));
    }

    els.theaterHint.textContent =
      THEATER_HINTS[state.theaterMode] || THEATER_HINTS.viewport;
  }

  function save(partial) {
    state = { ...state, ...partial };
    render();
    if (storageArea) {
      storageArea.set(partial);
    }
  }

  function bindEvents() {
    els.scrollableRelated.addEventListener("change", (e) => {
      save({ scrollableRelated: e.target.checked });
    });

    els.enhancedTheater.addEventListener("change", (e) => {
      save({ enhancedTheater: e.target.checked });
    });

    els.protectControls.addEventListener("change", (e) => {
      save({ protectControls: e.target.checked });
    });

    els.hidePauseOverlay.addEventListener("change", (e) => {
      save({ hidePauseOverlay: e.target.checked });
    });

    for (const btn of els.segButtons) {
      btn.addEventListener("click", () => {
        save({ theaterMode: btn.dataset.mode });
      });
    }

    els.openThumbBtn.addEventListener("click", () => {
      if (!activeThumbUrl) return;
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: activeThumbUrl });
      } else {
        window.open(activeThumbUrl, "_blank", "noopener,noreferrer");
      }
    });

    els.resetBtn.addEventListener("click", () => {
      save({ ...DEFAULT_SETTINGS });
    });
  }

  bindEvents();
  loadThumbnailPreview();

  if (storageArea) {
    storageArea.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        render();
        return;
      }
      state = { ...DEFAULT_SETTINGS, ...items };
      render();
    });
  } else {
    render();
  }
})();
