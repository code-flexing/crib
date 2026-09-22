"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { apiFetch, normalizePageStatus, type PageStatus } from "@/lib/api";

type ProviderPage = { status?: string; rejectionReason?: string; reason?: string; displayName?: string };

export default function PageStatusView() {
  const router = useRouter();
  const [page, setPage] = useState<ProviderPage | null>(null);
  const [status, setStatus] = useState<PageStatus>("none");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void apiFetch<ProviderPage>("/api/v1/provider-pages/me").then((result) => { setPage(result); setStatus(normalizePageStatus(result.status)); }).catch(() => setError("We could not load your Page status."));
  }, [router]);

  const openPage = () => router.push(status === "none" ? "/page/new" : "/page");
  const signOut = () => { localStorage.removeItem("safecrib_access_token"); localStorage.removeItem("safecrib_refresh_token"); router.replace("/login"); };
  const rejectionReason = page?.rejectionReason ?? page?.reason;

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8"><DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={status} /><section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8"><Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link><div className="mt-8 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Provider Page</p><h1 className="mt-2 text-3xl font-medium text-safecrib-black">{page?.displayName ?? "My Page"}</h1>{error ? <p className="mt-5 text-sm text-red-600">{error}</p> : <><p className="mt-5 text-sm text-black/65">Status: <span className="font-medium uppercase">{status}</span></p>{status === "pending" && <p className="mt-3 text-sm leading-6 text-black/60">Your Page is still under review.</p>}{status === "rejected" && <><p className="mt-3 text-sm leading-6 text-black/60">Your Page was not approved.</p>{rejectionReason && <p className="mt-2 text-sm text-black/60">Reason: {rejectionReason}</p>}<Button type="button" variant="secondary" className="mt-5" onClick={() => router.push("/page/new")}>Update and resubmit</Button></>}{status === "approved" && <p className="mt-3 text-sm leading-6 text-black/60">Your Page is approved. Provider listing management can be added here.</p>}</>}</div></section></main>;
}