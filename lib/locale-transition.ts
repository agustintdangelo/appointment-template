let activeOverlay: HTMLDivElement | null = null;
let transitionId = 0;
let enterTimer: number | undefined;
let holdTimer: number | undefined;
let cleanupTimer: number | undefined;

function clearLocaleTransitionTimers() {
  if (enterTimer) {
    window.clearTimeout(enterTimer);
  }

  if (holdTimer) {
    window.clearTimeout(holdTimer);
  }

  if (cleanupTimer) {
    window.clearTimeout(cleanupTimer);
  }
}

function createLocaleOverlay() {
  activeOverlay?.remove();

  const overlay = document.createElement("div");
  overlay.className = "locale-refresh-curtain";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  return overlay;
}

export function refreshWithLocaleTransition(refresh: () => void) {
  const canAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  clearLocaleTransitionTimers();
  transitionId += 1;

  if (!canAnimate) {
    activeOverlay?.remove();
    activeOverlay = null;
    refresh();
    return;
  }

  const currentTransitionId = transitionId;
  const overlay = createLocaleOverlay();

  window.requestAnimationFrame(() => {
    if (currentTransitionId !== transitionId) {
      return;
    }

    overlay.dataset.state = "visible";

    enterTimer = window.setTimeout(() => {
      if (currentTransitionId !== transitionId) {
        return;
      }

      refresh();

      holdTimer = window.setTimeout(() => {
        if (currentTransitionId !== transitionId) {
          return;
        }

        overlay.dataset.state = "hidden";

        cleanupTimer = window.setTimeout(() => {
          if (currentTransitionId !== transitionId) {
            return;
          }

          overlay.remove();
          activeOverlay = null;
        }, 360);
      }, 620);
    }, 260);
  });
}
