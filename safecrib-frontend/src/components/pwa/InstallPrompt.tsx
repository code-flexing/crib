"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/**
 * SafeCrib's own installation experience. The real browser install request
 * only fires when the person clicks "Install SafeCrib" below — never
 * automatically, and never via the browser's native popup.
 */
export function InstallPrompt() {
  const titleId = useId();
  const { isPromptOpen, dismiss, installAvailability, confirmInstall, platform } = usePWAInstall();

  return (
    <Modal open={isPromptOpen} onClose={dismiss} titleId={titleId}>
      <SafeCribLogo height={22} href={false} />

      <h2 id={titleId} className="mt-6 font-display text-xl text-safecrib-black">
        Install SafeCrib
      </h2>

      {installAvailability === "promptable" && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-black/60">
            Add SafeCrib to your home screen for quick, full-screen access — no browser tabs, no
            searching for a bookmark.
          </p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={dismiss}>
              Not now
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                void confirmInstall();
              }}
            >
              Install SafeCrib
            </Button>
          </div>
        </>
      )}

      {installAvailability === "manual" && <ManualInstructions platform={platform} onClose={dismiss} />}

      {installAvailability === "unsupported" && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-black/60">
            Your browser doesn&apos;t support installing web apps directly. Open SafeCrib in
            Chrome, Edge or Safari to add it to your device.
          </p>
          <div className="mt-7 flex justify-end">
            <Button variant="secondary" onClick={dismiss}>
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ManualInstructions({
  platform,
  onClose,
}: {
  platform: ReturnType<typeof usePWAInstall>["platform"];
  onClose: () => void;
}) {
  return (
    <>
      <p className="mt-3 text-sm leading-relaxed text-black/60">
        {platform === "ios"
          ? "Your browser doesn't offer an automatic install here. Add SafeCrib manually:"
          : "Automatic installation isn't available in this browser yet. You can still add SafeCrib manually:"}
      </p>

      {platform === "ios" ? (
        <ol className="mt-5 space-y-2 text-sm text-black/70">
          <li>1. Tap the Share icon in Safari&apos;s toolbar.</li>
          <li>2. Choose &ldquo;Add to Home Screen.&rdquo;</li>
          <li>3. Tap &ldquo;Add&rdquo; to confirm.</li>
        </ol>
      ) : (
        <p className="mt-5 text-sm text-black/70">
          Look for an &ldquo;Install&rdquo; or &ldquo;Add to Home Screen&rdquo; option in your browser&apos;s menu.
        </p>
      )}

      <div className="mt-7 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}

