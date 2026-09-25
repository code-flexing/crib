"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { clearSession, getCachedCurrentUser, isUnauthorizedError, normalizeAccountStatus, type AccountStatus } from "@/lib/api";

type User = {
  email?: string;
  role?: string;
  studentProfileStatus?: unknown;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AccountStatus>("not_submitted");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    const cachedUser = getCachedCurrentUser<User>();
    if (cachedUser) {
      setUser(cachedUser);
      setStatus(normalizeAccountStatus(cachedUser.studentProfileStatus));
    }

    try {
      const currentUser = getCachedCurrentUser<User>();
      const profileStatus = currentUser?.studentProfileStatus;
      setStatus(normalizeAccountStatus(profileStatus));
      setUser(currentUser ?? null);
      setRejectionReason("");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearSession();
        router.replace("/login?reason=session-expired");
        return;
      }
    }
  }, [router]);

  const signOut = () => {
    localStorage.removeItem("safecrib_access_token");
    localStorage.removeItem("safecrib_refresh_token");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] pb-24 md:pb-8">
      <DashboardNav onCreatePage={() => router.push("/page/new")} onSignOut={signOut} pageStatus="none" />
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-safecrib-green transition-colors hover:text-[#0a5f47] hover:underline">
          <span aria-hidden="true">←</span> Back to home
        </Link>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-safecrib-green">Account settings</p>
            <h1 className="mt-3 font-display text-3xl italic text-safecrib-black sm:text-4xl">Your profile</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">
              Keep your details current so the SafeCrib community knows who they are connecting with.
            </p>
          </div>

          <aside className="rounded-[14px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(11,12,14,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Account review</p>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${status === "rejected" ? "bg-red-50 text-red-700" : status === "pending" ? "bg-amber-50 text-amber-800" : "bg-[#eaf7f1] text-safecrib-green"}`}>
                {status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-4 space-y-2 break-words border-t border-black/10 pt-4 text-sm text-black/60">
              <p>
                <span className="text-black/40">Email</span>
                <br />
                {user?.email ?? "Loading..."}
              </p>
              <p>Student</p>
            </div>
            {rejectionReason && <p className="mt-4 border-t border-red-100 pt-4 text-sm leading-5 text-red-700">{rejectionReason}</p>}
          </aside>
        </div>

        {status !== "approved" && status !== "pending" && (
          <div className="mt-8 overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_20px_45px_rgba(11,12,14,0.06)]">
            <div className="border-b border-black/10 bg-[#eaf7f1] px-5 py-4 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Profile update</p>
            </div>

            <div className="p-5 sm:p-7">
              <h2 className="text-2xl font-medium text-safecrib-black sm:text-3xl">A better profile starts here.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">
                Complete your student profile and submit it for review so your account is verified properly.
              </p>

              <Button type="button" className="mt-7 w-full sm:w-auto" onClick={() => router.push("/profile/complete")}>
                Start profile update <span aria-hidden="true">→</span>
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
