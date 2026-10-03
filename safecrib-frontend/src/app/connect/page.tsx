"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Icon } from "@/components/ui/Icon";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { apiFetch, cachedApiFetch, resolveMediaUrl, unwrapData } from "@/lib/api";

type UserResult = {
  id: string;
  displayName?: string | null;
  profilePicture?: string | null;
  role: string;
  school?: string | null;
  followerCount: number;
  isFollowing: boolean;
};
type PageResult = {
  id: string;
  ownerId: string;
  displayName: string;
  profilePicture?: string | null;
  providerType?: string | null;
  followerCount: number;
  isFollowing: boolean;
};
type DiscoveryResult = { users: UserResult[]; pages: PageResult[] };

function DiscoveryAvatar({ reference, seed, label }: { reference?: string | null; seed: string; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !reference) return;
    let active = true;
    void resolveMediaUrl(reference).then((url) => { if (active) setImageUrl(url); });
    return () => { active = false; };
  }, [reference, visible]);

  return <div ref={container} className="shrink-0"><ProfileAvatar src={imageUrl} seed={seed} alt={`${label} profile`} size="medium" className="h-12 w-12" /></div>;
}

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
    const updateFollow = (isFollowing: boolean) => setResult((current) => ({
      users: current.users.map((person) => kind === "user" && person.id === id
        ? { ...person, isFollowing, followerCount: Math.max(0, person.followerCount + (isFollowing === following ? 0 : isFollowing ? 1 : -1)) }
        : person),
      pages: current.pages.map((page) => kind === "page" && page.id === id
        ? { ...page, isFollowing, followerCount: Math.max(0, page.followerCount + (isFollowing === following ? 0 : isFollowing ? 1 : -1)) }
        : page),
    }));
    updateFollow(!following);
    try {
      const path = kind === "user"
        ? `/api/v1/users/${encodeURIComponent(id)}/follow`
        : `/api/v1/users/pages/${encodeURIComponent(id)}/follow`;
      await apiFetch(path, { method: following ? "DELETE" : "POST" });
    } catch (followError) {
      updateFollow(following);
      setError(followError instanceof Error ? followError.message : "We could not update that follow.");
    } finally {
      setPending(null);
    }
  };

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
    <DashboardNav onCreatePage={() => router.push("/page/new")} pageStatus="none" />
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <Link href="/dashboard" aria-label="Back to dashboard" title="Back to dashboard" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-black/65 transition-colors hover:bg-black/[0.03] hover:text-safecrib-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green">
        <Icon name="back" />
      </Link>
      <header className="mt-5 flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Find your community</p>
          <h1 className="mt-2 text-3xl font-bold text-safecrib-black">Connect with your campus mates</h1>
        </div>
        <label htmlFor="community-search" className="relative block w-full shrink-0 sm:max-w-sm">
          <span className="sr-only">Search users and pages</span>
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" />
          <input id="community-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, schools, and pages" className="w-full rounded-full border border-black/15 py-3 pl-11 pr-4 text-sm text-safecrib-black focus:border-safecrib-green focus:outline-none" />
        </label>
      </header>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {loading && <p role="status" className="mt-6 text-sm text-black/50">Searching verified community members...</p>}
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="campus-people-title">
        <div className="flex items-end justify-between gap-3 border-b border-black/10 pb-3">
          <h2 id="campus-people-title" className="text-xl font-semibold text-safecrib-black">People</h2>
          {!loading && <span className="text-xs text-black/45">{result.users.length} found</span>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {result.users.map((person) => <article key={person.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3.5 transition-colors hover:border-safecrib-green/25 sm:p-4">
            <Link href={`/profile/${encodeURIComponent(person.id)}`} aria-label={`Open ${person.displayName || "SafeCrib member"}'s profile`} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green">
              <DiscoveryAvatar reference={person.profilePicture} seed={person.id} label={person.displayName || "SafeCrib member"} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${encodeURIComponent(person.id)}`} className="block truncate font-semibold text-safecrib-black hover:text-safecrib-green">{person.displayName || "SafeCrib member"}</Link>
              <p className="mt-1 truncate text-xs text-black/50">{person.school || person.role.replaceAll("_", " ").toLowerCase()}</p>
              <p className="mt-1 text-xs text-black/45">{person.followerCount} followers</p>
            </div>
            <button type="button" aria-pressed={person.isFollowing} onClick={() => void toggleFollow("user", person.id, person.isFollowing)} disabled={pending === `user:${person.id}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${person.isFollowing ? "border border-black/15 text-black/65" : "bg-safecrib-green text-white"} disabled:opacity-50`}>{person.isFollowing ? "Following" : "Follow"}</button>
          </article>)}
          {!loading && result.users.length === 0 && <p className="text-sm text-black/50">No matching verified users.</p>}
        </div>
      </section>
      <section aria-labelledby="campus-pages-title">
        <div className="flex items-end justify-between gap-3 border-b border-black/10 pb-3">
          <h2 id="campus-pages-title" className="text-xl font-semibold text-safecrib-black">Provider pages</h2>
          {!loading && <span className="text-xs text-black/45">{result.pages.length} found</span>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {result.pages.map((page) => <article key={page.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3.5 transition-colors hover:border-safecrib-green/25 sm:p-4">
            <Link href={`/profile/${encodeURIComponent(page.ownerId)}`} aria-label={`Open ${page.displayName}'s profile`} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green">
              <DiscoveryAvatar reference={page.profilePicture} seed={page.ownerId} label={page.displayName} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${encodeURIComponent(page.ownerId)}`} className="block truncate font-semibold text-safecrib-black hover:text-safecrib-green">{page.displayName}</Link>
              <p className="mt-1 truncate text-xs text-black/50">{page.providerType?.replaceAll("_", " ").toLowerCase() || "provider"}</p>
              <p className="mt-1 text-xs text-black/45">{page.followerCount} followers</p>
            </div>
            <button type="button" aria-pressed={page.isFollowing} onClick={() => void toggleFollow("page", page.id, page.isFollowing)} disabled={pending === `page:${page.id}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${page.isFollowing ? "border border-black/15 text-black/65" : "bg-safecrib-green text-white"} disabled:opacity-50`}>{page.isFollowing ? "Following" : "Follow"}</button>
          </article>)}
          {!loading && result.pages.length === 0 && <p className="text-sm text-black/50">No matching verified provider pages.</p>}
        </div>
      </section>
      </div>
    </section>
  </main>;
}
