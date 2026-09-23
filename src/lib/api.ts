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
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(`/api/backend${path}`, { ...init, headers });
  if (response.status >= 500 && response.status < 600) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await fetch(`/api/backend${path}`, { ...init, headers });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
      ? payload.message
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

function nestedRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 3 || typeof value !== "object" || value === null) return [];
  const record = recordValue(value);
  const nested = Object.values(record).flatMap((child) => nestedRecords(child, depth + 1));
  return [record, ...nested];
}

function firstString(records: Record<string, unknown>[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      if (typeof record[key] === "string" && record[key]) return record[key];
      if (typeof record[key] === "number" && Number.isFinite(record[key])) return String(record[key]);
    }
  }
  return null;
}

function cloudinaryFieldValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined && entry !== null)
      .map(([key, entry]) => `${key}=${String(entry)}`)
      .join("|");
  }
  return String(value);
}

function firstValue(records: Record<string, unknown>[], key: string) {
  for (const record of records) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

type UploadPurpose = "AVATAR" | "COVER_PHOTO" | "PROOF_OF_LICENSE" | "PROOF_OF_STUDENTSHIP";

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

export async function uploadDocument(file: File, purpose: UploadPurpose) {
  if (typeof window !== "undefined") {
    const existingUpload = localStorage.getItem(`${pendingUploadPrefix}${purpose}`);
    if (existingUpload) {
      try {
        const draft = JSON.parse(existingUpload) as { id?: string; fingerprint?: string };
        if (draft.id && draft.fingerprint === uploadFingerprint(file)) return draft.id;
      } catch {
        localStorage.removeItem(`${pendingUploadPrefix}${purpose}`);
      }
    }
  }
  const signaturePath = purpose === "AVATAR"
    ? "/api/v1/media/profile-picture/upload-signature"
    : purpose === "COVER_PHOTO"
      ? "/api/v1/media/cover-photo/upload-signature"
      : "/api/v1/media/upload-signature";
  const rawSignature = await apiFetch<unknown>(signaturePath, {
    method: "POST",
    body: JSON.stringify({ ...(signaturePath === "/api/v1/media/upload-signature" ? { purpose } : {}), contentType: file.type, sizeBytes: file.size }),
  });
  const response = recordValue(rawSignature);
  const signature = recordValue(unwrapData<unknown>(rawSignature));
  const payload = recordValue(signature.uploadPayload ?? signature.upload ?? signature.data ?? signature);
  const media = recordValue(signature.media ?? signature.asset ?? payload.media ?? payload.asset);
  const records = [...nestedRecords(payload), ...nestedRecords(media), ...nestedRecords(signature), ...nestedRecords(response)];
  const explicitUploadUrl = firstString(records, ["uploadUrl", "signedUploadUrl", "signedUrl", "upload_url", "signed_upload_url", "uploadEndpoint", "url"]);
  const uploadUrl = explicitUploadUrl
    ?? (() => {
      const cloudName = firstString(records, ["cloud_name", "cloudName"]);
      if (!cloudName) return null;
      const resourceType = file.type === "application/pdf" || !file.type.startsWith("image/") ? "auto" : "image";
      return `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`;
    })();
  const mediaId = firstString([media, ...records], ["mediaId", "media_id", "mediaReference", "media_reference", "mediaKey", "media_key", "id", "assetId", "asset_id", "resourceId", "resource_id", "publicId", "public_id"]);
  if (!uploadUrl || !mediaId) {
    const returnedKeys = [...new Set(records.flatMap((record) => Object.keys(record)))].slice(0, 12).join(", ");
    throw new Error(`The upload service returned an incomplete ${purpose.toLowerCase().replaceAll("_", " ")} upload payload${returnedKeys ? ` (received: ${returnedKeys})` : ""}. Please try again.`);
  }

  const body = new FormData();
  const fields = recordValue(payload.fields ?? payload.uploadFields ?? payload.formData ?? payload.form_fields);
  const signedKeys = ["api_key", "timestamp", "signature", "public_id", "folder", "upload_preset", "expires_at", "context"] as const;
  for (const key of signedKeys) {
    const value = firstValue([payload, fields, ...records], key);
    if (value !== undefined) body.append(key, cloudinaryFieldValue(value));
  }
  body.append("file", file);
  try {
    const uploadResponse = await fetch(uploadUrl, { method: "POST", body });
    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
      const message = uploadError?.error?.message ?? uploadError?.message ?? `Upload rejected (${uploadResponse.status}).`;
      throw new Error(`The ${purpose.toLowerCase().replaceAll("_", " ")} upload failed: ${message}`);
    }
    await apiFetch(`/api/v1/media/${mediaId}/confirm`, { method: "POST", body: JSON.stringify({ assetId: mediaId, bytes: file.size, format: file.name.split(".").pop() ?? "" }) });
  } catch (error) {
    await apiFetch(`/api/v1/media/${mediaId}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
  if (typeof window !== "undefined") localStorage.setItem(`${pendingUploadPrefix}${purpose}`, JSON.stringify({ id: mediaId, fingerprint: uploadFingerprint(file) }));
  return mediaId;
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