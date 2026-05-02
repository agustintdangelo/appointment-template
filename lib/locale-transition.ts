const LOCALE_TRANSITION_ATTRIBUTE = "data-locale-transition";
const LOCALE_SECTION_SELECTOR = "[data-locale-section]";
const EXIT_DURATION_MS = 220;
const ENTER_DURATION_MS = 380;
const STAGGER_DURATION_MS = 36;
const MAX_STAGGER_ORDER = 5;
const REFRESH_HOLD_MS = 120;

let transitionId = 0;
let exitTimer: number | undefined;
let holdTimer: number | undefined;
let cleanupTimer: number | undefined;

type LocaleTransitionOptions = {
  onBeforeEnter?: () => void;
  onComplete?: () => void;
};

function clearLocaleTransitionTimers() {
  if (exitTimer) {
    window.clearTimeout(exitTimer);
  }

  if (holdTimer) {
    window.clearTimeout(holdTimer);
  }

  if (cleanupTimer) {
    window.clearTimeout(cleanupTimer);
  }
}

function getSectionOrder(section: Element) {
  const rawOrder = section.getAttribute("data-locale-section-order");
  const parsedOrder = Number(rawOrder);

  if (!Number.isFinite(parsedOrder)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(parsedOrder), MAX_STAGGER_ORDER));
}

function getMaxSectionDelay() {
  const sections = Array.from(document.querySelectorAll(LOCALE_SECTION_SELECTOR));
  const maxOrder = sections.reduce(
    (currentMaxOrder, section) => Math.max(currentMaxOrder, getSectionOrder(section)),
    0,
  );

  return maxOrder * STAGGER_DURATION_MS;
}

function setLocaleTransitionState(state: "exiting" | "entering") {
  document.documentElement.setAttribute(LOCALE_TRANSITION_ATTRIBUTE, state);
}

function clearLocaleTransitionState() {
  document.documentElement.removeAttribute(LOCALE_TRANSITION_ATTRIBUTE);
}

export function refreshWithLocaleTransition(
  refresh: () => void,
  options: LocaleTransitionOptions = {},
) {
  const canAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  clearLocaleTransitionTimers();
  transitionId += 1;

  if (!canAnimate) {
    clearLocaleTransitionState();
    refresh();
    options.onBeforeEnter?.();
    options.onComplete?.();
    return;
  }

  const currentTransitionId = transitionId;
  const maxSectionDelay = getMaxSectionDelay();

  setLocaleTransitionState("exiting");

  exitTimer = window.setTimeout(() => {
    if (currentTransitionId !== transitionId) {
      return;
    }

    refresh();

    holdTimer = window.setTimeout(() => {
      if (currentTransitionId !== transitionId) {
        return;
      }

      options.onBeforeEnter?.();

      window.requestAnimationFrame(() => {
        if (currentTransitionId !== transitionId) {
          return;
        }

        setLocaleTransitionState("entering");

        cleanupTimer = window.setTimeout(() => {
          if (currentTransitionId !== transitionId) {
            return;
          }

          clearLocaleTransitionState();
          options.onComplete?.();
        }, ENTER_DURATION_MS + maxSectionDelay + 80);
      });
    }, REFRESH_HOLD_MS);
  }, EXIT_DURATION_MS + maxSectionDelay);
}
