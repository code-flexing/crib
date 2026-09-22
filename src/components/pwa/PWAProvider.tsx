"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PWAInstallContext, type PWAInstallAvailability, type PWAInstallContextValue } from "@/hooks/usePWAInstall";
import {
  detectPlatform,
  detectBrowserEngine,
  isRunningStandalone,
  registerServiceWorker,
  supportsManualInstall,
  INSTALL_DISMISSED_KEY,
  type BeforeInstallPromptEvent,
  type PWABrowserEngine,
  type PWAPlatform,
} from "@/lib/pwa";

export function PWAProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [platform, setPlatform] = useState<PWAPlatform>("unknown");
  const [engine, setEngine] = useState<PWABrowserEngine>("unknown");

  useEffect(() => {
    if (pathname === "/" && isRunningStandalone()) {
      router.replace("/login");
    }
  }, [pathname, router]);

  useEffect(() => {
    registerServiceWorker();
    setPlatform(detectPlatform());
    setEngine(detectBrowserEngine());
    setIsInstalled(isRunningStandalone());

    function onBeforeInstallPrompt(event: Event) {
      // Stop the browser from showing its own install UI so SafeCrib can
      // decide when and how to ask.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsPromptOpen(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const requestInstall = useCallback(() => {
    setIsPromptOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    setIsPromptOpen(false);
    try {
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      // Storage may be unavailable (private browsing); dismissal simply
      // won't be remembered, which is a safe fallback.
    }
  }, []);

  const confirmInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsPromptOpen(false);
  }, [deferredPrompt]);

  const installAvailability: PWAInstallAvailability = deferredPrompt
    ? "promptable"
    : supportsManualInstall(engine)
      ? "manual"
      : "unsupported";

  const value = useMemo<PWAInstallContextValue>(
    () => ({
      installAvailability,
      isInstalled,
      isPromptOpen,
      platform,
      requestInstall,
      confirmInstall,
      dismiss,
    }),
    [installAvailability, isInstalled, isPromptOpen, platform, requestInstall, confirmInstall, dismiss]
  );

  return <PWAInstallContext.Provider value={value}>{children}</PWAInstallContext.Provider>;
}

