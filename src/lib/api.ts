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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

type UploadSignature = {
  uploadUrl?: string;
  signedUploadUrl?: string;
  url?: string;
  fields?: Record<string, string>;
  uploadFields?: Record<string, string>;
  id?: string;
  mediaId?: string;
};

export async function uploadDocument(file: File, purpose: "PROOF_OF_LICENSE" | "PROOF_OF_STUDENTSHIP") {
  const signature = await apiFetch<UploadSignature>("/api/v1/media/upload-signature", {
    method: "POST",
    body: JSON.stringify({ purpose, contentType: file.type, sizeBytes: file.size }),
  });
  const uploadUrl = signature.uploadUrl ?? signature.signedUploadUrl ?? signature.url;
  const mediaId = signature.mediaId ?? signature.id;
  if (!uploadUrl || !mediaId) throw new Error("The upload service returned an incomplete upload payload.");

  const body = new FormData();
  Object.entries(signature.fields ?? signature.uploadFields ?? {}).forEach(([key, value]) => body.append(key, value));
  body.append("file", file);
  const uploadResponse = await fetch(uploadUrl, { method: "POST", body });
  if (!uploadResponse.ok) throw new Error("The document upload failed.");
  await apiFetch(`/api/v1/media/${mediaId}/confirm`, { method: "POST", body: JSON.stringify({ bytes: file.size, format: file.name.split(".").pop() ?? "" }) });
  return mediaId;
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