"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminFetch, ApiError, unwrapData } from "@/lib/api";
import { errorMessage, SupportConversation, supportTimestamp } from "@/lib/support";

export default function AdminSupportConversationPage() {
  const { id: encodedId } = useParams<{ id: string }>();
  const id = decodeURIComponent(encodedId);
  const router = useRouter();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = unwrapData<SupportConversation>(await adminFetch<unknown>(`/api/v1/admin/support/conversations/${encodeURIComponent(id)}`));
      setConversation(response);
    } catch (loadError) {
      if (loadError instanceof ApiError && (loadError.status === 401 || loadError.status === 403)) { router.replace(`/admin/login?reason=${loadError.status === 403 ? "denied" : "session-expired"}`); return; }
      setError(loadError instanceof ApiError && loadError.status === 404 ? "This conversation is unavailable." : "We could not load this conversation.");
    } finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(), 12000); return () => window.clearInterval(interval); }, [load]);

  const reply = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) { setError("Write a reply before sending."); return; }
    if (trimmed.length > 5000) { setError("Your message must be 5,000 characters or fewer."); return; }
    setSending(true); setError("");
    try { await adminFetch(`/api/v1/admin/support/conversations/${encodeURIComponent(id)}/messages`, { method: "POST", body: JSON.stringify({ message: trimmed }) }); setMessage(""); await load(); }
    catch (replyError) { if (replyError instanceof ApiError && (replyError.status === 401 || replyError.status === 403)) { router.replace(`/admin/login?reason=${replyError.status === 403 ? "denied" : "session-expired"}`); return; } setError(replyError instanceof ApiError && replyError.status === 429 ? "Too many requests. Please try again later." : errorMessage(replyError, "We could not send the reply.")); }
    finally { setSending(false); }
  };

  const resolve = async () => {
    setResolving(true); setError("");
    try { await adminFetch(`/api/v1/admin/support/conversations/${encodeURIComponent(id)}/resolve`, { method: "PATCH", body: JSON.stringify({}) }); await load(); }
    catch (resolveError) { if (resolveError instanceof ApiError && (resolveError.status === 401 || resolveError.status === 403)) { router.replace(`/admin/login?reason=${resolveError.status === 403 ? "denied" : "session-expired"}`); return; } setError(resolveError instanceof ApiError ? resolveError.message : "We could not resolve this conversation."); }
    finally { setResolving(false); }
  };

  if (loading) return <p className="text-sm text-black/55">Loading support conversation...</p>;
  if (!conversation) return <div><Link href="/admin/support" className="text-sm font-medium text-safecrib-green hover:underline">Back to inbox</Link><p className="mt-6 text-sm text-red-600">{error}</p></div>;
  const messages = conversation.messages ?? [];

  return <div><Link href="/admin/support" className="text-sm font-medium text-safecrib-green hover:underline">Back to inbox</Link><div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">User support</p><h1 className="mt-2 text-3xl font-medium">{conversation.subject || "Support request"}</h1><p className="mt-2 text-sm text-black/55">{conversation.user?.displayName || "User"} · {conversation.user?.email || "No email"}</p></div>{conversation.status === "OPEN" && <button type="button" disabled={resolving} onClick={() => void resolve()} className="rounded-[4px] border border-black/15 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40">{resolving ? "Resolving..." : "Resolve conversation"}</button>}</div>{error && <p className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}<div className="mt-8 space-y-4">{messages.map((item) => <article key={item.id} className={`max-w-[90%] rounded-[8px] border p-4 ${item.senderRole === "USER" ? "border-black/10 bg-white" : "ml-auto border-safecrib-green/20 bg-safecrib-green/[0.06]"}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{item.body}</p><p className="mt-3 text-xs text-black/45">{item.senderRole === "ADMIN" ? "You" : conversation.user?.displayName || "User"} · {supportTimestamp(item.createdAt)}</p></article>)}</div>{conversation.status === "OPEN" ? <form onSubmit={reply} className="mt-8 rounded-[8px] border border-black/10 bg-white p-5"><label className="block text-sm font-medium">Reply<textarea required maxLength={5000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /><span className="mt-1 block text-right text-xs font-normal text-black/45">{message.length}/5000</span></label><button type="submit" disabled={sending} className="mt-4 rounded-[4px] bg-safecrib-green px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{sending ? "Sending..." : "Send reply"}</button></form> : <p className="mt-8 rounded-[8px] border border-black/10 bg-white p-4 text-sm text-black/60">This conversation is resolved.</p>}</div>;
}
