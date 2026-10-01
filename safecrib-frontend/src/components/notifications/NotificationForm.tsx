"use client";

import { useId, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { isValidEmail, subscribeToNotifications } from "@/lib/notifications";

type SubmissionState = "idle" | "submitting" | "success" | "error" | "invalid";

export function NotificationForm() {
  const titleId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");

  function close() {
    setOpen(false);
    // Reset after the close transition would run in a future version; for
    // now reset immediately so re-opening starts clean.
    setState("idle");
    setEmail("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setState("invalid");
      return;
    }

    setState("submitting");

    try {
      await subscribeToNotifications(email);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Get notified
      </Button>

      <Modal open={open} onClose={close} titleId={titleId}>
        <h2 id={titleId} className="font-display text-xl text-safecrib-black">
          Get notified
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          Leave your email and we&apos;ll let you know when SafeCrib is ready.
        </p>

        {state === "success" ? (
          <div className="mt-6">
            <p className="text-sm text-safecrib-green">
              Noted — we&apos;ll be in touch when there&apos;s something to see.
            </p>
            <div className="mt-7 flex justify-end">
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit} noValidate>
            <label htmlFor={inputId} className="text-xs text-black/50">
              Email address
            </label>
            <input
              id={inputId}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (state !== "idle" && state !== "submitting") setState("idle");
              }}
              placeholder="you@university.edu.ng"
              aria-invalid={state === "invalid" || state === "error"}
              aria-describedby={state === "invalid" || state === "error" ? `${inputId}-message` : undefined}
              className="mt-2 w-full rounded-[3px] border border-black/20 bg-transparent px-4 py-3 text-sm text-safecrib-black placeholder:text-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green"
            />

            {state === "invalid" && (
              <p id={`${inputId}-message`} className="mt-2 text-xs text-black/60">
                Enter a valid email address.
              </p>
            )}
            {state === "error" && (
              <p id={`${inputId}-message`} className="mt-2 text-xs text-black/60">
                Notifications aren&apos;t connected yet — check back soon.
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={state === "submitting"}>
                {state === "submitting" ? "Sending…" : "Notify me"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
