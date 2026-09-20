"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";

function getNetworkSettingsUrl() {
  const userAgent = navigator.userAgent;

  if (/Android/i.test(userAgent)) {
    return "intent:#Intent;action=android.settings.WIFI_SETTINGS;end";
  }

  if (/Windows/i.test(userAgent)) return "ms-settings:network";
  if (/Macintosh/i.test(userAgent)) return "x-apple.systempreferences:com.apple.Network-Settings.extension";

  return null;
}

export function NetworkMonitor() {
  const titleId = useId();
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
      setIsChecking(false);
      setSettingsMessage("");
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  async function retryConnection() {
    setIsChecking(true);
    setSettingsMessage("");

    try {
      const response = await fetch(`/manifest.webmanifest?network-check=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (response.ok) {
        setIsOffline(false);
        return;
      }
    } catch {
      // The offline state remains until the browser reports a connection.
    } finally {
      setIsChecking(false);
    }
  }

  function openNetworkSettings() {
    const settingsUrl = getNetworkSettingsUrl();

    if (!settingsUrl) {
      setSettingsMessage("Open your device settings and check Wi-Fi or mobile data.");
      return;
    }

    window.location.assign(settingsUrl);
  }

  if (!isOffline) return null;

  return (
    <div className="safecrib-offline-backdrop" role="presentation">
      <section
        className="safecrib-offline-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-description`}
      >
        <div className="safecrib-offline-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-safecrib-green">Connection paused</p>
        <h2 id={titleId} className="mt-3 font-display text-2xl text-safecrib-black">
          You&apos;re offline
        </h2>
        <p id={`${titleId}-description`} className="mt-3 text-sm leading-relaxed text-black/60">
          Your current page is safe. Reconnect to continue using SafeCrib.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Button type="button" variant="primary" onClick={() => void retryConnection()} loading={isChecking}>
            {isChecking ? "Checking connection…" : "Try again"}
          </Button>
          <Button type="button" variant="secondary" onClick={openNetworkSettings}>
            Open network settings
          </Button>
        </div>

        {settingsMessage && <p className="mt-4 text-xs leading-relaxed text-black/50">{settingsMessage}</p>}
      </section>
    </div>
  );
}