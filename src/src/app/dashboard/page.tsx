"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
    }
  }, [router]);

  const signOut = () => {
    setIsSigningOut(true);
    localStorage.removeItem("safecrib_access_token");
    localStorage.removeItem("safecrib_refresh_token");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] px-4 py-6 sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link href="/" aria-label="SafeCrib home">
          <SafeCribLogo height={28} href={false} />
        </Link>
        <Button type="button" variant="secondary" loading={isSigningOut} onClick={signOut}>
          Sign out
        </Button>
      </header>

      <section className="mx-auto mt-16 w-full max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-safecrib-green">Dashboard</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-medium text-safecrib-black sm:text-5xl">
          Welcome to SafeCrib.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-black/65">
          Choose how you want to continue. Your authenticated marketplace and provider tools will live here.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[12px] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(11,12,14,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Student</p>
            <h2 className="mt-2 text-xl font-medium text-safecrib-black">Discover verified homes</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">Search and inspect verified accommodation after the marketplace is connected.</p>
          </div>
          <div className="rounded-[12px] border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(11,12,14,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Provider</p>
            <h2 className="mt-2 text-xl font-medium text-safecrib-black">Create your Page</h2>
            <p className="mt-2 text-sm leading-6 text-black/60">Start provider verification before uploading a home.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
