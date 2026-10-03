"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { apiFetch, cachedApiFetch, unwrapData } from "@/lib/api";

type UserResult = {
  id: string;
  displayName?: string | null;
  role: string;
  school?: string | null;
  followerCount: number;
  isFollowing: boolean;
};
type PageResult = {
  id: string;
  ownerId: string;
  displayName: string;
  providerType?: string | null;
  followerCount: number;
  isFollowing: boolean;
};
type DiscoveryResult = { users: UserResult[]; pages: PageResult[] };

export default function ConnectPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DiscoveryResult>({ users: [], pages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void cachedApiFetch<unknown>(`/api/v1/users/discover?q=${encodeURIComponent(query.trim())}`)
        .then((response) => {
          if (active) {
            setResult(unwrapData<DiscoveryResult>(response));
            setError("");
          }
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : "We could not find campus mates right now.");
        })
        .finally(() => { if (active) setLoading(false); });
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const toggleFollow = async (kind: "user" | "page", id: string, following: boolean) => {
    const key = `${kind}:${id}`;
    setPending(key);
    try {
      const path = kind === "user"
        ? `/api/v1/users/${encodeURIComponent(id)}/follow`
        : `/api/v1/users/pages/${encodeURIComponent(id)}/follow`;
      await apiFetch(path, { method: following ? "DELETE" : "POST" });
      setResult((current) => ({
        users: current.users.map((person) => kind === "user" && person.id === id
          ? { ...person, isFollowing: !following, followerCount: person.followerCount + (following ? -1 : 1) }
          : person),
        pages: current.pages.map((page) => kind === "page" && page.id === id
          ? { ...page, isFollowing: !following, followerCount: page.followerCount + (following ? -1 : 1) }
          : page),
      }));
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "We could not update that follow.");
    } finally {
      setPending(null);
    }
  };

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
    <DashboardNav onCreatePage={() => router.push("/page/new")} pageStatus="none" />
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">← Back to dashboard</Link>
      <header className="mt-5 rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Find your community</p>
        <h1 className="mt-2 text-3xl font-bold text-safecrib-black">Connect with your campus mates</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">Find verified students and provider pages. Following a page helps its homes appear more often in your dashboard.</p>
        <label htmlFor="community-search" className="sr-only">Search users and pages</label>
        <input id="community-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, schools, and pages" className="mt-5 w-full rounded-xl border border-black/15 px-4 py-3 text-sm text-safecrib-black focus:border-safecrib-green focus:outline-none" />
      </header>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {loading && <p role="status" className="mt-6 text-sm text-black/50">Searching verified community members...</p>}
      <section className="mt-8" aria-labelledby="campus-people-title">
        <h2 id="campus-people-title" className="text-xl font-semibold text-safecrib-black">People</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.users.map((person) => <article key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4">
            <div className="min-w-0">
              <Link href={`/profile/${encodeURIComponent(person.id)}`} className="truncate font-semibold text-safecrib-black hover:text-safecrib-green">{person.displayName || "SafeCrib member"}</Link>
              <p className="mt-1 text-xs text-black/50">{person.school || person.role.replaceAll("_", " ").toLowerCase()} · {person.followerCount} followers</p>
            </div>
            <button type="button" onClick={() => void toggleFollow("user", person.id, person.isFollowing)} disabled={pending === `user:${person.id}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${person.isFollowing ? "border border-black/15 text-black/65" : "bg-safecrib-green text-white"} disabled:opacity-50`}>{person.isFollowing ? "Following" : "Follow"}</button>
          </article>)}
          {!loading && result.users.length === 0 && <p className="text-sm text-black/50">No matching verified users.</p>}
        </div>
      </section>
      <section className="mt-8" aria-labelledby="campus-pages-title">
        <h2 id="campus-pages-title" className="text-xl font-semibold text-safecrib-black">Provider pages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.pages.map((page) => <article key={page.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4">
            <div className="min-w-0">
              <Link href={`/profile/${encodeURIComponent(page.ownerId)}`} className="truncate font-semibold text-safecrib-black hover:text-safecrib-green">{page.displayName}</Link>
              <p className="mt-1 text-xs text-black/50">{page.providerType?.replaceAll("_", " ").toLowerCase() || "provider"} · {page.followerCount} followers</p>
            </div>
            <button type="button" onClick={() => void toggleFollow("page", page.id, page.isFollowing)} disabled={pending === `page:${page.id}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${page.isFollowing ? "border border-black/15 text-black/65" : "bg-safecrib-green text-white"} disabled:opacity-50`}>{page.isFollowing ? "Following" : "Follow"}</button>
          </article>)}
          {!loading && result.pages.length === 0 && <p className="text-sm text-black/50">No matching verified provider pages.</p>}
        </div>
      </section>
    </section>
  </main>;
}
