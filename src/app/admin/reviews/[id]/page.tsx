"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, ApiError, resolveAdminMediaUrl, unwrapData } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

type EntityType = "student_profile" | "provider_page";
type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type ReviewSubmission = { id: string; entityId?: string | null; email: string; status: ReviewStatus; entityType: EntityType; submittedData: Record<string, unknown>; rejectionReason: string | null; submittedAt: string; createdAt: string; reviewer?: unknown; reviewedAt?: string };

const labels: Record<string, string> = { displayName: "Display name", providerType: "Provider type", schoolOfStudy: "School of study", courseOfStudy: "Course of study", level: "Level", dateOfBirth: "Date of birth", gender: "Gender", phoneNumber: "Phone number", emergencyContact: "Emergency contact", socialLinks: "Social links", description: "Business details", phone: "Contact number", payoutAccounts: "Payout accounts" };
const mediaFields = new Set(["profilePicture", "coverPhoto", "proofOfStudentship", "proofOfLicense"]);

function display(value: unknown): string { if (value === null || value === undefined || value === "") return "Not provided"; return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value); }
function label(key: string) { return labels[key] ?? key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replace(/^./, (letter) => letter.toUpperCase()); }
function category(entityType: EntityType, submittedData: Record<string, unknown>) { if (entityType === "student_profile") return "Student account"; return submittedData.providerType === "LANDLORD" ? "Landlord account" : "Agent account"; }

export default function AdminReviewPage() {
  const { id: encodedId } = useParams<{ id: string }>();
  const id = decodeURIComponent(encodedId);
  const router = useRouter();
  const [review, setReview] = useState<ReviewSubmission | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string | null>>({});
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ReviewStatus | null>(null);
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const detail = unwrapData<ReviewSubmission>(await adminFetch<unknown>(`/api/v1/admin/review-queue/${encodeURIComponent(id)}`));
      setReview(detail);
      setReason(detail.rejectionReason ?? "");
      const references = Object.entries(detail.submittedData).filter(([key, value]) => mediaFields.has(key) && typeof value === "string");
      const resolved = await Promise.all(references.map(async ([key, value]) => [key, await resolveAdminMediaUrl(value)] as const));
      setMediaUrls(Object.fromEntries(resolved));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) { setError("This submission no longer exists. Return to the queue and refresh it."); }
      else if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) router.replace(`/admin/login?reason=${loadError.status === 403 ? "denied" : "session-expired"}`);
      else setError("We could not load this submission.");
    } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (status: "APPROVED" | "REJECTED") => {
    const trimmedReason = reason.trim();
    if (status === "REJECTED" && !trimmedReason) { setError("A rejection reason is required."); return; }
    if (trimmedReason.length > 2000) { setError("The rejection reason must be 2,000 characters or fewer."); return; }
    setAction(status); setError("");
    try {
      const reviewSubmission = (submissionId: string) => adminFetch<unknown>("/api/v1/admin/review", { method: "POST", body: JSON.stringify({ submissionId, status, ...(status === "REJECTED" ? { reason: trimmedReason } : {}) }) });
      let result: unknown;
      try {
        result = await reviewSubmission(id);
      } catch (reviewError) {
        if (!(reviewError instanceof ApiError) || reviewError.status !== 404 || review?.entityType !== "student_profile" || !review.entityId || review.entityId === id) throw reviewError;
        result = await reviewSubmission(review.entityId);
      }
      const response = unwrapData<Partial<ReviewSubmission>>(result);
      setReview((current) => current ? { ...current, ...response, status, rejectionReason: status === "REJECTED" ? trimmedReason : null } : current);
    } catch (reviewError) {
      if (reviewError instanceof ApiError && (reviewError.status === 401 || reviewError.status === 403)) { router.replace(`/admin/login?reason=${reviewError.status === 403 ? "denied" : "session-expired"}`); return; }
      if (reviewError instanceof ApiError && reviewError.status === 409) { setError("Another admin already reviewed this submission. Reloading its latest state."); await load(); }
      else if (reviewError instanceof ApiError && reviewError.status === 400) setError(reviewError.message || "Check the review details and try again.");
      else setError(reviewError instanceof ApiError ? reviewError.message : "We could not update this review.");
    } finally { setAction(null); }
  };

  if (loading) return <p className="text-sm text-black/55">Loading submission...</p>;
  if (!review) return <div><Link href="/admin" className="text-sm font-medium text-safecrib-green hover:underline">Back to queue</Link><p className="mt-6 text-sm text-red-600">{error || "Submission unavailable."}</p></div>;
  const fields = Object.entries(review.submittedData).filter(([key]) => !mediaFields.has(key));
  const pending = review.status === "PENDING";

  return <><div><Link href="/admin" className="text-sm font-medium text-safecrib-green hover:underline">Back to queue</Link><div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Submission review</p><h1 className="mt-2 text-3xl font-medium">{display(review.submittedData.displayName ?? review.email)}</h1><p className="mt-2 text-sm text-black/55">{category(review.entityType, review.submittedData)} · {review.entityType === "provider_page" && typeof review.submittedData.providerType === "string" ? review.submittedData.providerType : review.status}</p></div><div className="flex gap-3"><button type="button" disabled={!pending || action !== null} onClick={() => setConfirmAction("APPROVED")} className="rounded-[4px] bg-safecrib-green px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{action === "APPROVED" ? "Approving..." : "Approve"}</button><button type="button" disabled={!pending || action !== null} onClick={() => setConfirmAction("REJECTED")} className="rounded-[4px] border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-40">{action === "REJECTED" ? "Rejecting..." : "Reject"}</button></div></div>{error && <p className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]"><div className="rounded-[8px] border border-black/10 bg-white p-6"><h2 className="text-lg font-medium">{review.entityType === "provider_page" ? "Provider Page details" : "Student profile details"}</h2><dl className="mt-5 divide-y divide-black/10">{fields.map(([key, value]) => <div key={key} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]"><dt className="text-sm font-medium text-black/55">{label(key)}</dt><dd className="whitespace-pre-wrap break-words text-sm">{display(value)}</dd></div>)}</dl>{pending && <label className="mt-6 block text-sm font-medium">Rejection reason<textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required when rejecting" rows={4} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /><span className="mt-1 block text-xs font-normal text-black/45">{reason.length}/2000</span></label>}{!pending && review.rejectionReason && <p className="mt-6 rounded-[4px] bg-red-50 p-4 text-sm text-red-700"><strong>Rejection reason:</strong> {review.rejectionReason}</p>}</div><aside className="space-y-5"><div className="rounded-[8px] border border-black/10 bg-white p-5"><h2 className="font-medium">Profile picture</h2>{mediaUrls.profilePicture ? <Image src={mediaUrls.profilePicture} alt="Applicant profile" width={280} height={280} unoptimized className="mt-4 aspect-square w-full rounded-[6px] object-cover" /> : <p className="mt-4 text-sm text-black/55">No accessible profile picture.</p>}</div><div className="rounded-[8px] border border-black/10 bg-white p-5 text-sm"><p className="font-medium">Uploaded references</p>{(["proofOfStudentship", "proofOfLicense", "coverPhoto"] as const).map((key) => <p key={key} className="mt-3 break-words text-black/60">{label(key)}: {mediaUrls[key] ? <a href={mediaUrls[key] ?? undefined} target="_blank" rel="noreferrer" className="font-medium text-safecrib-green hover:underline">Open file</a> : display(review.submittedData[key])}</p>)}</div></aside></div></div><Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)} titleId="review-confirm-title"><h2 id="review-confirm-title" className="text-xl font-medium">{confirmAction === "REJECTED" ? "Reject this submission?" : "Approve this submission?"}</h2><p className="mt-3 text-sm leading-6 text-black/65">{confirmAction === "REJECTED" ? "The rejection reason will be recorded and shown in the submission history." : "This decision will mark the submission as approved and cannot be repeated."}</p>{confirmAction === "REJECTED" && <p className="mt-4 rounded-[4px] bg-black/[0.03] p-3 text-sm whitespace-pre-wrap">{reason.trim() || "A rejection reason is required."}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmAction(null)} className="rounded-[4px] border border-black/15 px-4 py-2 text-sm font-medium">Cancel</button><button type="button" disabled={confirmAction === "REJECTED" && !reason.trim()} onClick={() => { const selected = confirmAction; setConfirmAction(null); if (selected) void decide(selected); }} className="rounded-[4px] bg-safecrib-green px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Confirm {confirmAction === "REJECTED" ? "rejection" : "approval"}</button></div></Modal></>;
}
