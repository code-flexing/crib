"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, ApiError, unwrapData } from "@/lib/api";
import { SupportConversation, supportTimestamp, unwrapSupportList } from "@/lib/support";

type InboxStatus = "OPEN" | "RESOLVED";

export default function AdminSupportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<InboxStatus>("OPEN");
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = unwrapData<unknown>(await adminFetch<unknown>(`/api/v1/admin/support/conversations?status=${status}`));
      setConversations(unwrapSupportList(response));
    } catch (loadError) {
      if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) { router.replace(`/admin/login?reason=${loadError.status === 403 ? "denied" : "session-expired"}`); return; }
      setError(loadError instanceof ApiError && loadError.status === 429 ? "Too many requests. Try again shortly." : "We could not load the support inbox.");
    } finally { setLoading(false); }
  }, [router, status]);

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 12000); return () => window.clearInterval(interval); }, [load]);

  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Operations</p><h1 className="mt-2 text-3xl font-medium">Support inbox</h1><p className="mt-2 text-sm text-black/60">Private conversations from users who need help.</p></div><div className="flex items-center gap-3"><select aria-label="Support status" value={status} onChange={(event) => setStatus(event.target.value as InboxStatus)} className="rounded-[4px] border border-black/15 bg-white px-3 py-2 text-sm"><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option></select><button type="button" onClick={() => void load()} className="rounded-[4px] border border-black/15 bg-white px-4 py-2 text-sm font-medium">Refresh</button></div></div>{error && <p className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}<div className="mt-8 overflow-hidden rounded-[8px] border border-black/10 bg-white">{loading ? <p className="p-6 text-sm text-black/55">Loading support inbox...</p> : conversations.length === 0 ? <p className="p-6 text-sm text-black/55">No {status.toLowerCase()} support conversations.</p> : <div className="divide-y divide-black/10">{conversations.map((conversation) => <Link key={conversation.id} href={`/admin/support/${encodeURIComponent(conversation.id)}`} className="block p-5 hover:bg-[#f7faf8]"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-medium">{conversation.subject || "Support request"}</p><p className="mt-1 text-sm text-black/55">{conversation.user?.displayName || conversation.user?.email || "User"} · {conversation.user?.email || "No email"}</p></div><span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{supportTimestamp(conversation.lastMessageAt ?? conversation.createdAt)}</span></div><p className="mt-3 line-clamp-2 text-sm text-black/60">{conversation.latestMessage?.body || "Open conversation"}</p></Link>)}</div>}</div></div>;
}
