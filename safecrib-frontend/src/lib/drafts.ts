const DRAFT_VERSION = 1;

type DraftEnvelope<T> = {
  version: number;
  updatedAt: number;
  data: T;
};

export function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<DraftEnvelope<T>>;
    if (draft.version !== DRAFT_VERSION || draft.data === undefined) return null;
    return draft.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeDraft<T>(key: string, data: T) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, JSON.stringify({
      version: DRAFT_VERSION,
      updatedAt: Date.now(),
      data,
    } satisfies DraftEnvelope<T>));
  } catch {
    // Draft persistence is best effort when storage is unavailable or full.
  }
}

export function removeDraft(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}