export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PWAPlatform = "ios" | "android" | "desktop" | "unknown";

/** Browser engine, detected separately from OS platform, since install support depends on both. */
export type PWABrowserEngine = "chrome" | "edge" | "safari" | "firefox" | "unknown";

export const INSTALL_DISMISSED_KEY = "safecrib:install-dismissed";

/** Coarse platform detection, used only to decide which install copy to show. */
export function detectPlatform(): PWAPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/.test(ua)) return "desktop";

  return "unknown";
}

/**
 * Browser engine detection. Order matters: Edge and Chrome UAs both contain
 * "Chrome", and Chrome's UA also contains "Safari", so the more specific
 * checks must run first or every Chromium browser misidentifies as Chrome
 * (or every browser misidentifies as Safari).
 */
export function detectBrowserEngine(): PWABrowserEngine {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (/FxiOS|Firefox/.test(ua)) return "firefox";
  if (/EdgiOS|Edg\//.test(ua)) return "edge";
  if (/CriOS|Chrome/.test(ua)) return "chrome";
  if (/Safari/.test(ua)) return "safari";

  return "unknown";
}

/**
 * Browsers SafeCrib can reliably walk someone through a manual "Add to Home
 * Screen" / "Install" flow on. Firefox (desktop and mobile) has no such
 * flow, so it's deliberately excluded rather than given misleading steps.
 */
export function supportsManualInstall(engine: PWABrowserEngine): boolean {
  return engine === "chrome" || engine === "edge" || engine === "safari";
}

/** True when the app is already running as an installed, standalone PWA. */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari exposes this non-standard flag instead of the display-mode query.
  const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandaloneDisplay || isIosStandalone;
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures shouldn't break the app; the page still works
      // fully without the service worker.
    });
  });
}

