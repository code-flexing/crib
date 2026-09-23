"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { ApiError, logoutSession, verifyAdminSession, type AuthUser } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      return;
    }
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/admin/login");
      return;
    }
    void verifyAdminSession().then(setUser).catch((error) => {
      if (error instanceof ApiError && error.status === 403) router.replace("/admin/login?reason=denied");
      else router.replace("/admin/login?reason=session-expired");
    }).finally(() => setChecking(false));
  }, [pathname, router]);

  const signOut = () => {
    void logoutSession().finally(() => router.replace("/admin/login"));
  };

  if (pathname === "/admin/login") return <>{children}</>;
  if (checking || !user) return <main className="flex min-h-screen items-center justify-center text-sm text-black/55">Checking administrator access...</main>;

  return (
    <main className="min-h-screen bg-[#f4f7f4] text-safecrib-black">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-8">
          <Link href="/admin" aria-label="SafeCrib admin home"><SafeCribLogo height={28} href={false} /></Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-black/55 sm:block">{user.email}</span>
            <button type="button" onClick={signOut} className="rounded-[4px] border border-black/15 px-3 py-2 text-sm font-medium hover:bg-black/[0.03]">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Admin console</p>
          <nav className="mt-4 flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            <Link href="/admin" className={`block whitespace-nowrap rounded-[4px] px-3 py-2 text-sm font-medium ${pathname === "/admin" ? "bg-safecrib-green text-white" : "text-black/65 hover:bg-white"}`}>Review queue</Link>
            <Link href="/admin/admins/new" className={`block whitespace-nowrap rounded-[4px] px-3 py-2 text-sm font-medium ${pathname === "/admin/admins/new" ? "bg-safecrib-green text-white" : "text-black/65 hover:bg-white"}`}>Create admin</Link>
            <Link href="/admin/support" className={`block whitespace-nowrap rounded-[4px] px-3 py-2 text-sm font-medium ${pathname.startsWith("/admin/support") ? "bg-safecrib-green text-white" : "text-black/65 hover:bg-white"}`}>Support inbox</Link>
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
