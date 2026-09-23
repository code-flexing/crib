"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, authenticatedFetch, clearSession, unwrapData } from "@/lib/api";
import { errorMessage, SupportConversation, supportTimestamp, unwrapSupportList } from "@/lib/support";

export default function SupportPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const response = unwrapData<unknown>(await authenticatedFetch<unknown>("/api/v1/support/conversations"));
      setConversations(unwrapSupportList(response));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) { clearSession(); router.replace("/login?reason=session-expired"); return; }
      setError(errorMessage(loadError, "We could not load your support conversations."));
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void load();
    const interval = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(interval);
  }, [load, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();
    if (!trimmedMessage) { setError("Describe the issue before sending."); return; }
    if (trimmedMessage.length > 5000) { setError("Your message must be 5,000 characters or fewer."); return; }
    if (trimmedSubject.length > 160) { setError("Your subject must be 160 characters or fewer."); return; }
    setSending(true); setError(""); setSuccess("");
    try {
      const response = await authenticatedFetch<unknown>("/api/v1/support/conversations", { method: "POST", body: JSON.stringify({ subject: trimmedSubject || undefined, message: trimmedMessage }) });
      const conversation = unwrapData<SupportConversation>(response);
      setSubject(""); setMessage(""); setSuccess("Your support request was sent.");
      await load();
      if (conversation?.id) router.push(`/support/${encodeURIComponent(conversation.id)}`);
    } catch (sendError) {
      if (sendError instanceof ApiError && sendError.status === 401) { clearSession(); router.replace("/login?reason=session-expired"); return; }
      setError(sendError instanceof ApiError && sendError.status === 429 ? "Too many requests. Please try again later." : errorMessage(sendError, "We could not send your support request."));
    } finally { setSending(false); }
  };

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] px-4 py-8 sm:px-8"><section className="mx-auto max-w-5xl"><Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link><div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Support</p><h1 className="mt-2 text-3xl font-medium">How can we help?</h1><p className="mt-2 text-sm text-black/60">Send an issue to the SafeCrib support team and keep the conversation here.</p></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="rounded-[8px] border border-black/10 bg-white"><div className="border-b border-black/10 p-5"><h2 className="font-medium">Your conversations</h2></div>{loading ? <p className="p-5 text-sm text-black/55">Loading conversations...</p> : conversations.length === 0 ? <p className="p-5 text-sm text-black/55">No support conversations yet.</p> : <div className="divide-y divide-black/10">{conversations.map((conversation) => <Link key={conversation.id} href={`/support/${encodeURIComponent(conversation.id)}`} className="block p-5 hover:bg-[#f7faf8]"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{conversation.subject || "Support request"}</p><p className="mt-2 line-clamp-2 text-sm text-black/60">{conversation.latestMessage?.body || conversation.messages?.[conversation.messages.length - 1]?.body || "Open conversation"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${conversation.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-black/5 text-black/55"}`}>{conversation.status}</span></div><p className="mt-3 text-xs text-black/45">{supportTimestamp(conversation.lastMessageAt ?? conversation.createdAt)}</p></Link>)}</div>}</div><form onSubmit={submit} className="rounded-[8px] border border-black/10 bg-white p-5"><h2 className="font-medium">Start a new issue</h2><label className="mt-5 block text-sm font-medium">Subject <span className="font-normal text-black/45">(optional)</span><input maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label><label className="mt-5 block text-sm font-medium">Message<textarea required maxLength={5000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /><span className="mt-1 block text-right text-xs font-normal text-black/45">{message.length}/5000</span></label>{error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}{success && <p className="mt-4 text-sm text-safecrib-green" role="status">{success}</p>}<button type="submit" disabled={sending} className="mt-5 w-full rounded-[4px] bg-safecrib-green px-4 py-3 text-sm font-medium text-white disabled:opacity-40">{sending ? "Sending..." : "Send support request"}</button></form></div></section></main>;
}
