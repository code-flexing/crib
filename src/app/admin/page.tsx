"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, ApiError, unwrapData } from "@/lib/api";

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type EntityType = "student_profile" | "provider_page";
type ReviewSubmission = {
  id: string;
  email: string;
  tier: "STUDENT" | "LANDLORD";
  reviewType: "SIGNUP" | "CREATE_PAGE";
  status: ReviewStatus;
  entityType: EntityType;
  entityId: string | null;
  submittedData: Record<string, unknown>;
  rejectionReason: string | null;
  submittedAt: string;
  createdAt: string;
};

function category(item: ReviewSubmission) { if (item.entityType === "student_profile") return "Student account"; return item.submittedData.providerType === "LANDLORD" ? "Landlord account" : "Agent account"; }
function name(item: ReviewSubmission) { const value = item.submittedData.displayName; return typeof value === "string" && value ? value : item.email; }

export default function AdminQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<ReviewSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = unwrapData<unknown>(await adminFetch<unknown>(`/api/v1/admin/review-queue?status=${statusFilter}`));
      const queue = Array.isArray(response) ? response : typeof response === "object" && response !== null && "items" in response && Array.isArray(response.items) ? response.items : [];
      setItems(queue as ReviewSubmission[]);
    } catch (loadError) {
      if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) {
        router.replace(`/admin/login?reason=${loadError.status === 403 ? "denied" : "session-expired"}`);
        return;
      }
      setError(loadError instanceof ApiError && loadError.status === 403 ? "This account is not allowed to view the review queue." : "We could not load the review queue.");
    } finally { setLoading(false); }
  }, [router, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Operations</p><h1 className="mt-2 text-3xl font-medium">Review queue</h1><p className="mt-2 text-sm text-black/60">Student profiles and provider Pages waiting for review.</p></div><div className="flex items-center gap-3"><label className="text-sm font-medium">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReviewStatus)} className="ml-2 rounded-[4px] border border-black/15 bg-white px-3 py-2 font-normal"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><button type="button" onClick={() => void load()} className="rounded-[4px] border border-black/15 bg-white px-4 py-2 text-sm font-medium hover:bg-black/[0.03]">Refresh queue</button></div></div>
      {error && <p className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-8 overflow-hidden rounded-[8px] border border-black/10 bg-white">
        {loading ? <p className="p-6 text-sm text-black/55">Loading submissions...</p> : items.length === 0 ? <p className="p-6 text-sm text-black/55">No pending submissions.</p> : <div className="divide-y divide-black/10">{items.map((item) => <Link key={item.id} href={`/admin/reviews/${encodeURIComponent(item.id)}`} className="block p-5 hover:bg-[#f7faf8]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-medium">{name(item)}</p><p className="mt-1 text-sm text-black/55">{item.email}{typeof item.submittedData.schoolOfStudy === "string" ? ` · ${item.submittedData.schoolOfStudy}` : typeof item.submittedData.providerType === "string" ? ` · ${item.submittedData.providerType}` : ""}</p></div><div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em]"><span className="text-black/45">{category(item)}</span><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">{item.status}</span></div></div><p className="mt-3 text-xs text-black/45">Submitted {new Date(item.submittedAt || item.createdAt).toLocaleString()}</p></Link>)}</div>}
      </div>
    </div>
  );
}
