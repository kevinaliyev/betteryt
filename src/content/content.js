(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    scrollableRelated: true,
    enhancedTheater: true,
    theaterMode: "viewport", // "viewport" | "cinematic" | "fullbleed"
    protectControls: true,
    hidePauseOverlay: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let watchFlexyObserver = null;
  let observedWatchEl = null;
  let boundSecondaryEl = null;
  let resizeTimer = null;
  let lastContinuationNudge = 0;

  const storageArea =
    typeof chrome !== "undefined" && chrome.storage
      ? chrome.storage.sync || chrome.storage.local
      : null;

  function applySettingsToDom(settings) {
    const root = document.documentElement;
    if (!root) return;

    root.setAttribute("data-byt-scrollable-related", String(Boolean(settings.scrollableRelated)));
    root.setAttribute("data-byt-theater", String(Boolean(settings.enhancedTheater)));
    root.setAttribute("data-byt-theater-mode", settings.theaterMode || "viewport");
    root.setAttribute("data-byt-protect-controls", String(Boolean(settings.protectControls)));
    root.setAttribute("data-byt-hide-pause-overlay", String(Boolean(settings.hidePauseOverlay)));
  }

  function triggerPlayerResize() {
    clearTimeout(resizeTimer);
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 180);
  }

  function syncWatchState() {
    const root = document.documentElement;
    if (!root) return;

    const isWatchPage = window.location.pathname === "/watch";
    const watchEl = isWatchPage ? document.querySelector("ytd-watch-flexy") : null;

    const isTheater = Boolean(watchEl && watchEl.hasAttribute("theater"));
    const isFullscreen = Boolean(
      (watchEl && watchEl.hasAttribute("fullscreen")) || document.fullscreenElement
    );

    const prevTheater = root.classList.contains("byt-theater-active");
    root.classList.toggle("byt-theater-active", isTheater);
    root.classList.toggle("byt-fullscreen-active", isFullscreen);

    if (!isTheater) {
      root.classList.remove("byt-header-reveal");
    }

    if (prevTheater !== isTheater && currentSettings.enhancedTheater) {
      triggerPlayerResize();
    }
  }

  function bindSecondaryScrollContinuation() {
    const secondary = document.querySelector(
      "ytd-watch-flexy #secondary, ytd-watch-grid #secondary"
    );
    if (!secondary || secondary === boundSecondaryEl) return;

    boundSecondaryEl = secondary;
    secondary.addEventListener(
      "scroll",
      () => {
        if (!currentSettings.scrollableRelated) return;
        const remaining =
          secondary.scrollHeight - secondary.scrollTop - secondary.clientHeight;
        const now = Date.now();
        if (remaining < 300 && now - lastContinuationNudge > 250) {
          lastContinuationNudge = now;
          window.dispatchEvent(new Event("scroll"));
        }
      },
      { passive: true }
    );
  }

  function attachWatchObserver() {
    const watchEl = document.querySelector("ytd-watch-flexy");
    if (watchEl && watchEl !== observedWatchEl) {
      if (watchFlexyObserver) {
        watchFlexyObserver.disconnect();
      }
      observedWatchEl = watchEl;
      watchFlexyObserver = new MutationObserver(() => {
        syncWatchState();
        bindSecondaryScrollContinuation();
      });
      watchFlexyObserver.observe(watchEl, {
        attributes: true,
        attributeFilter: ["theater", "fullscreen", "is-two-columns_"]
      });
    }

    syncWatchState();
    bindSecondaryScrollContinuation();
  }

  function setupFullbleedHeaderReveal() {
    window.addEventListener(
      "mousemove",
      (event) => {
        const root = document.documentElement;
        if (
          !currentSettings.enhancedTheater ||
          currentSettings.theaterMode !== "fullbleed" ||
          !root.classList.contains("byt-theater-active") ||
          root.classList.contains("byt-fullscreen-active")
        ) {
          return;
        }

        if (event.clientY <= 16) {
          root.classList.add("byt-header-reveal");
        } else if (event.clientY > 72) {
          root.classList.remove("byt-header-reveal");
        }
      },
      { passive: true }
    );
  }

  function initDomObservers() {
    attachWatchObserver();
    setupFullbleedHeaderReveal();

    // YouTube SPA navigation events
    window.addEventListener("yt-navigate-finish", () => {
      setTimeout(() => {
        attachWatchObserver();
        if (currentSettings.enhancedTheater) {
          triggerPlayerResize();
        }
      }, 60);
    });

    window.addEventListener("yt-page-data-updated", () => {
      attachWatchObserver();
    });

    document.addEventListener("fullscreenchange", () => {
      syncWatchState();
    });

    // Fallback observer until ytd-watch-flexy mounts on initial watch load
    const mountObserver = new MutationObserver(() => {
      if (window.location.pathname === "/watch") {
        const watchEl = document.querySelector("ytd-watch-flexy");
        if (watchEl && watchEl !== observedWatchEl) {
          attachWatchObserver();
        }
        bindSecondaryScrollContinuation();
      }
    });

    if (document.body) {
      mountObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Apply defaults immediately at document_start to avoid layout flash
  applySettingsToDom(currentSettings);

  if (storageArea) {
    storageArea.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
      currentSettings = { ...DEFAULT_SETTINGS, ...items };
      applySettingsToDom(currentSettings);
      syncWatchState();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" && areaName !== "local") return;

      let theaterChanged = false;
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in DEFAULT_SETTINGS) {
          currentSettings[key] = newValue;
          if (key === "enhancedTheater" || key === "theaterMode") {
            theaterChanged = true;
          }
        }
      }

      applySettingsToDom(currentSettings);
      syncWatchState();
      if (theaterChanged) {
        triggerPlayerResize();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDomObservers, { once: true });
  } else {
    initDomObservers();
  }
})();
