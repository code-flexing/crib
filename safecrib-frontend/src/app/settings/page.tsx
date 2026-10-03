"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { SettingsSignOutButton } from "@/components/settings/SettingsSignOutButton";
import { BackHomeLink } from "@/components/ui/BackHomeLink";
import { Button } from "@/components/ui/Button";
import { VerificationOverview } from "@/components/verification/VerificationOverview";
import { apiFetch, clearSession, getCurrentUser, isUnauthorizedError, normalizeAccountStatus, unwrapData, type AccountStatus } from "@/lib/api";

type User = {
  email?: string;
  role?: string;
  displayName?: unknown;
  studentProfileStatus?: unknown;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AccountStatus>("not_submitted");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    let active = true;
    void getCurrentUser<User>().then(async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      const role = String(currentUser.role ?? "").toUpperCase();
      if (["UNVERIFIED", "STUDENT"].includes(role)) {
        const latestStatus = await apiFetch<unknown>("/api/v1/student-profiles/status")
          .then(unwrapData<unknown>)
          .then(normalizeAccountStatus)
          .catch(() => normalizeAccountStatus(currentUser.studentProfileStatus));
        if (active) setStatus(latestStatus);
      } else {
        setStatus(normalizeAccountStatus(currentUser.studentProfileStatus));
      }
    }).catch((loadError: unknown) => {
      if (active && isUnauthorizedError(loadError)) {
        clearSession();
        router.replace("/login?reason=session-expired");
      }
    });
    return () => { active = false; };
  }, [router]);

  const role = String(user?.role ?? "").toUpperCase();
  const studentMode = ["UNVERIFIED", "STUDENT"].includes(role);
  const accountLabel = studentMode ? status.replaceAll("_", " ") : role ? role.replaceAll("_", " ").toLowerCase() : "Loading...";

  return (
    <main className="min-h-screen bg-[#f7f8f5] pb-24 md:pb-8">
      <DashboardNav onCreatePage={() => router.push("/page/new")} pageStatus="none" canManagePage={["AGENT", "LANDLORD"].includes(role)} />
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <BackHomeLink />

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-safecrib-green">Account settings</p>
            <h1 className="mt-3 font-display text-3xl italic text-safecrib-black sm:text-4xl">Your settings</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">
              Keep your details current so the SafeCrib community knows who they are connecting with.
            </p>
          </div>

          <aside className="rounded-[14px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(11,12,14,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Account mode</p>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${status === "rejected" ? "bg-red-50 text-red-700" : status === "pending" ? "bg-amber-50 text-amber-800" : "bg-[#eaf7f1] text-safecrib-green"}`}>
                {accountLabel}
              </span>
            </div>
            <div className="mt-4 space-y-2 break-words border-t border-black/10 pt-4 text-sm text-black/60">
              <p>
                <span className="text-black/40">Email</span>
                <br />
                {user?.email ?? "Loading..."}
              </p>
              <p>{role === "AGENT" ? "Agent account" : role === "LANDLORD" ? "Landlord account" : role === "ADMIN" ? "Administrator account" : "Student account"}</p>
            </div>
          </aside>
        </div>

        <AccountSettingsPanel />
        <VerificationOverview />

        {studentMode && status !== "pending" && status !== "approved" && (
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
        <SettingsSignOutButton />
      </section>
    </main>
  );
}
