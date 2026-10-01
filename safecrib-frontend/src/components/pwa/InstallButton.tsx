"use client";

import { Button } from "@/components/ui/Button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallButton() {
  const { isInstalled, requestInstall } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <Button variant="secondary" onClick={requestInstall} className="min-w-[9.5rem] whitespace-nowrap px-4 py-3 text-sm shadow-[0_8px_18px_rgba(11,12,14,0.05)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,12,14,0.08)]">
      Install SafeCrib
    </Button>
  );
}
