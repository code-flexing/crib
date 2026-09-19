"use client";

import { createContext, useContext } from "react";
import type { BeforeInstallPromptEvent, PWAPlatform } from "@/lib/pwa";

/**
 * Whether — and how — SafeCrib can currently help someone install the app:
 * - "promptable": the browser fired `beforeinstallprompt`; we can trigger
 *   the real install flow directly.
 * - "manual": no native prompt, but this browser does support installing
 *   PWAs via its own menu ("Add to Home Screen" / "Install"), so we can
 *   walk the person through it.
 * - "unsupported": this browser has no installation path at all (e.g.
 *   Firefox). We say so honestly instead of giving steps that don't exist.
 */
export type PWAInstallAvailability = "promptable" | "manual" | "unsupported";

export type PWAInstallContextValue = {
  installAvailability: PWAInstallAvailability;
  /** The app is already running as an installed, standalone PWA. */
  isInstalled: boolean;
  /** Whether SafeCrib's custom install UI should currently be shown. */
  isPromptOpen: boolean;
  platform: PWAPlatform;
  /** Opens SafeCrib's custom install modal (does not touch the browser yet). */
  requestInstall: () => void;
  /** Triggers the real browser install flow. Only call from a user click inside the modal. */
  confirmInstall: () => Promise<void>;
  /** Closes the modal and remembers the dismissal so it isn't shown again immediately. */
  dismiss: () => void;
};

export const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

/**
 * Centralized PWA installation state. Must be used within <PWAProvider />,
 * which owns the single `beforeinstallprompt` listener for the app.
 */
export function usePWAInstall(): PWAInstallContextValue {
  const context = useContext(PWAInstallContext);

  if (!context) {
    throw new Error("usePWAInstall must be used within a <PWAProvider />");
  }

  return context;
}

export type { BeforeInstallPromptEvent };

