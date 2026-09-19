const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Integration point for the future notifications backend.
 *
 * There is no backend yet, so this deliberately does not pretend to save
 * anything. It rejects with a typed error the UI can render honestly.
 * Replace the body with a real request (e.g. POST /api/notifications) when
 * the backend exists — the call signature below is the contract callers
 * already depend on, so no UI changes should be needed.
 */
export async function subscribeToNotifications(email: string): Promise<void> {
  void email;
  throw new NotificationBackendUnavailableError();
}

export class NotificationBackendUnavailableError extends Error {
  constructor() {
    super("Notifications aren't connected yet.");
    this.name = "NotificationBackendUnavailableError";
  }
}
