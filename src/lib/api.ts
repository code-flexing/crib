export type AccountStatus = "approved" | "pending" | "rejected" | "not_submitted";
export type PageStatus = "none" | "pending" | "approved" | "rejected";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export type AuthUser = { email?: string; role?: string; displayName?: unknown };

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("safecrib_access_token");
  localStorage.removeItem("safecrib_refresh_token");
}

export async function refreshSession() {
  const refreshToken = typeof window === "undefined" ? null : localStorage.getItem("safecrib_refresh_token");
  if (!refreshToken) throw new ApiError(401, "Session expired.");
  const response = await requestApi<unknown>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  const tokens = extractTokens(response);
  if (!tokens) throw new ApiError(401, "Session refresh failed.");
  localStorage.setItem("safecrib_access_token", tokens.accessToken);
  localStorage.setItem("safecrib_refresh_token", tokens.refreshToken);
}

export async function authenticatedFetch<T>(path: string, init: RequestInit = {}) {
  return apiFetch<T>(path, init);
}

export async function adminFetch<T>(path: string, init: RequestInit = {}) {
  return authenticatedFetch<T>(path, init);
}

export async function verifyAdminSession() {
  const user = unwrapData<AuthUser>(await adminFetch<unknown>("/api/v1/auth/me", { method: "POST" }));
  if (String(user.role ?? "").toUpperCase() !== "ADMIN") throw new ApiError(403, "Administrator access required.");
  return user;
}

export async function logoutSession() {
  const refreshToken = typeof window === "undefined" ? null : localStorage.getItem("safecrib_refresh_token");
  try {
    if (refreshToken) await apiFetch("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
  } finally {
    clearSession();
  }
}

export async function getCurrentUser<T>() {
  try {
    return unwrapData<T>(await apiFetch<unknown>("/api/v1/users/me"));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404 || error.status === 405)) {
      try {
        return await apiFetch<T>("/api/v1/auth/me", { method: "POST" });
      } catch (fallbackError) {
        if (!(fallbackError instanceof ApiError) || fallbackError.status !== 401) throw fallbackError;
        const refreshToken = typeof window === "undefined" ? null : localStorage.getItem("safecrib_refresh_token");
        if (!refreshToken) throw fallbackError;

        const refreshed = await apiFetch<unknown>("/api/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
        const tokens = extractTokens(refreshed);
        if (!tokens) throw fallbackError;
        localStorage.setItem("safecrib_access_token", tokens.accessToken);
        localStorage.setItem("safecrib_refresh_token", tokens.refreshToken);
        return unwrapData<T>(await apiFetch<unknown>("/api/v1/users/me"));
      }
    }
    throw error;
  }
}

const clientCachePrefix = "safecrib_cache:";

function cacheKey(path: string) {
  return `${clientCachePrefix}${path}`;
}

function readClientCache<T>(path: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(cacheKey(path));
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export function getCachedCurrentUser<T>() {
  return readClientCache<T>("/api/v1/users/me") ?? readClientCache<T>("/api/v1/auth/me");
}

function writeClientCache(path: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(cacheKey(path), JSON.stringify(value)); } catch { /* Storage may be unavailable or full. */ }
}

export function clearClientCache(...paths: string[]) {
  if (typeof window === "undefined") return;
  paths.forEach((path) => localStorage.removeItem(cacheKey(path)));
}

const pendingUploadPrefix = "safecrib_pending_upload:";

function uploadFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function clearPendingUploads() {
  if (typeof window === "undefined") return;
  (["AVATAR", "COVER_PHOTO", "PROOF_OF_LICENSE", "PROOF_OF_STUDENTSHIP"] as const).forEach((purpose) => {
    localStorage.removeItem(`${pendingUploadPrefix}${purpose}`);
  });
}

export function getPendingUpload(purpose: UploadPurpose) {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`${pendingUploadPrefix}${purpose}`);
  if (!stored) return null;
  try {
    const draft = JSON.parse(stored) as { id?: string };
    return draft.id ?? null;
  } catch {
    return stored;
  }
}

export async function cachedApiFetch<T>(path: string, init: RequestInit = {}) {
  const cached = init.method && init.method !== "GET" ? null : readClientCache<T>(path);
  const request = apiFetch<T>(path, init).then((value) => {
    if (!init.method || init.method === "GET") writeClientCache(path, value);
    return value;
  });
  if (cached !== null) {
    void request.catch(() => undefined);
    return cached;
  }
  return request;
}

export async function cachedCurrentUser<T>() {
  const cached = getCachedCurrentUser<T>();
  const request = getCurrentUser<T>().then((value) => {
    writeClientCache("/api/v1/users/me", value);
    writeClientCache("/api/v1/auth/me", value);
    return value;
  });
  if (cached !== null) {
    void request.catch(() => undefined);
    return cached;
  }
  return request;
}

function extractTokens(value: unknown): { accessToken: string; refreshToken: string } | null {
  if (typeof value !== "object" || value === null) return null;
  const response = value as Record<string, unknown>;
  const nested = typeof response.data === "object" && response.data !== null ? response.data as Record<string, unknown> : null;
  const accessToken = response.accessToken ?? response.access_token ?? nested?.accessToken ?? nested?.access_token;
  const refreshToken = response.refreshToken ?? response.refresh_token ?? nested?.refreshToken ?? nested?.refresh_token;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") return null;
  return {
    accessToken: accessToken.replace(/^Bearer\s+/i, "").trim(),
    refreshToken: refreshToken.replace(/^Bearer\s+/i, "").trim(),
  };
}

export function displayName(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.displayName === "string" && record.displayName.trim()) return record.displayName.trim();
    const firstName = typeof record.firstName === "string" ? record.firstName.trim() : "";
    const lastName = typeof record.lastName === "string" ? record.lastName.trim() : "";
    if (firstName || lastName) return `${firstName} ${lastName}`.trim();
    if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
  }
  return "";
}

export function unwrapData<T>(value: unknown): T {
  if (typeof value === "object" && value !== null && "data" in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

let refreshPromise: Promise<void> | null = null;

async function requestApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("safecrib_access_token");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(`/api/backend${path}`, { ...init, headers });
  if (response.status >= 500 && response.status < 600) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await fetch(`/api/backend${path}`, { ...init, headers });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const payloadRecord = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : null;
    const responseMessage = payloadRecord?.message;
    const message = Array.isArray(responseMessage)
      ? responseMessage.filter((item): item is string => typeof item === "string").join(" ")
      : typeof responseMessage === "string"
        ? responseMessage
        : typeof payloadRecord?.error === "string"
          ? payloadRecord.error
          : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await requestApi<T>(path, init);
  } catch (error) {
    if (!isUnauthorizedError(error) || typeof window === "undefined" || path === "/api/v1/auth/refresh") throw error;
    const refreshToken = localStorage.getItem("safecrib_refresh_token");
    if (!refreshToken) throw error;

    try {
      refreshPromise ??= refreshSession().finally(() => { refreshPromise = null; });
      await refreshPromise;
      return await requestApi<T>(path, init);
    } catch (refreshError) {
      clearSession();
      throw refreshError;
    }
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export type UploadPurpose = "AVATAR" | "COVER_PHOTO" | "LISTING_PHOTO" | "LISTING_VIDEO" | "PROVIDER_LOGO" | "STUDENT_ID" | "PROOF_OF_STUDENTSHIP" | "PROOF_OF_LICENSE" | "CONTRACT_DOCUMENT";

export type PendingUpload = {
  id: string;
  purpose?: UploadPurpose | string;
  status?: string;
  createdAt?: string;
};

export async function getPendingUploads() {
  const response = unwrapData<unknown>(await apiFetch<unknown>("/api/v1/media/pending"));
  if (Array.isArray(response)) return response as PendingUpload[];
  const record = recordValue(response);
  const items = record.pending ?? record.uploads ?? record.data;
  return Array.isArray(items) ? items as PendingUpload[] : [];
}

export async function cancelPendingUpload(id: string) {
  await apiFetch(`/api/v1/media/pending/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (typeof window !== "undefined") {
    (["AVATAR", "COVER_PHOTO", "PROOF_OF_LICENSE", "PROOF_OF_STUDENTSHIP"] as const).forEach((purpose) => {
      const key = `${pendingUploadPrefix}${purpose}`;
      const stored = localStorage.getItem(key);
      if (stored?.includes(id)) localStorage.removeItem(key);
    });
  }
}

export async function uploadDocument(file: File, purpose: UploadPurpose, entityId?: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);
  if (entityId) body.append("entityId", entityId);

  const response = await apiFetch<{ url?: string }>("/api/v1/media/upload", {
    method: "POST",
    body,
  });
  if (typeof response.url !== "string" || !response.url) {
    throw new Error(`The ${purpose.toLowerCase().replaceAll("_", " ")} upload did not return a media URL.`);
  }
  return response.url;
}

export async function resolveMediaUrl(reference: unknown): Promise<string | null> {
  if (typeof reference !== "string" || !reference) return null;
  if (/^(https?:|data:|blob:)/.test(reference)) return reference;

  try {
    const response = await apiFetch<unknown>(`/api/v1/media/${encodeURIComponent(reference)}/access`);
    if (typeof response === "string") return response;
    if (typeof response === "object" && response !== null) {
      const mediaResponse = response as Record<string, unknown>;
      for (const key of ["url", "accessUrl", "deliveryUrl"]) {
        if (typeof mediaResponse[key] === "string") return mediaResponse[key];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveAdminMediaUrl(reference: unknown): Promise<string | null> {
  if (typeof reference !== "string" || !reference) return null;
  if (/^(https?:|data:|blob:)/.test(reference)) return reference;
  try {
    const response = unwrapData<unknown>(await adminFetch<unknown>(`/api/v1/media/${encodeURIComponent(reference)}/access`));
    if (typeof response === "string") return response;
    if (typeof response === "object" && response !== null) {
      const mediaResponse = response as Record<string, unknown>;
      for (const key of ["url", "accessUrl", "deliveryUrl"]) if (typeof mediaResponse[key] === "string") return mediaResponse[key];
    }
  } catch { return null; }
  return null;
}

export function normalizeAccountStatus(value: unknown): AccountStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "not_submitted";
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  return "not_submitted";
}

export function normalizePageStatus(value: unknown): PageStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "none";
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  return "none";
}