"use client";

import { Button } from "@/components/ui/Button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallButton() {
  const { isInstalled, requestInstall } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <Button variant="secondary" onClick={requestInstall}>
      Install SafeCrib
    </Button>
  );
}
