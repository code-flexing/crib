"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch, normalizeAccountStatus, normalizePageStatus, type AccountStatus, type PageStatus } from "@/lib/api";

type StudentProfile = {
  displayName?: string;
  proofOfStudentship?: string;
  schoolOfStudy?: string;
  courseOfStudy?: string;
  level?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  socialLinks?: Record<string, string>;
  status?: string;
  rejectionReason?: string;
  reason?: string;
};

type User = { email?: string; role?: string; displayName?: string; studentProfileStatus?: unknown };
type ProviderPage = { status?: string } | null;
type FormState = Omit<StudentProfile, "status" | "rejectionReason" | "reason" | "socialLinks"> & { socialLinks: string };

const emptyForm: FormState = {
  displayName: "",
  proofOfStudentship: "",
  schoolOfStudy: "",
  courseOfStudy: "",
  level: "",
  profilePicture: "",
  dateOfBirth: "",
  gender: "",
  phoneNumber: "",
  emergencyContact: "",
  socialLinks: "",
};

function getStatus(user: User, statusResponse: unknown, studentProfile: StudentProfile | null): AccountStatus {
  const fromUser = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
    ? user.studentProfileStatus.status
    : user.studentProfileStatus;
  const fromResponse = statusResponse && typeof statusResponse === "object" && "status" in statusResponse
    ? statusResponse.status
    : statusResponse;
  return normalizeAccountStatus(studentProfile?.status ?? fromUser ?? fromResponse);
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<AccountStatus>("not_submitted");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    void Promise.all([
      apiFetch<User>("/api/v1/users/me"),
      apiFetch<StudentProfile | null>("/api/v1/student-profiles/me").catch(() => null),
      apiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      apiFetch<ProviderPage>("/api/v1/provider-pages/me").catch(() => null),
    ]).then(([currentUser, studentProfile, statusResponse, page]) => {
      setUser(currentUser);
      setStatus(getStatus(currentUser, statusResponse, studentProfile));
      setPageStatus(normalizePageStatus(page?.status));
      setRejectionReason(studentProfile?.rejectionReason ?? studentProfile?.reason ?? "");
      setForm({
        ...emptyForm,
        ...studentProfile,
        displayName: studentProfile?.displayName ?? currentUser.displayName ?? "",
        socialLinks: studentProfile?.socialLinks ? JSON.stringify(studentProfile.socialLinks) : "",
      });
    }).catch(() => setMessage("We could not load your profile. Please try again."));
  }, [router]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    let socialLinks: Record<string, string> | undefined;
    try {
      if (form.socialLinks.trim()) socialLinks = JSON.parse(form.socialLinks) as Record<string, string>;
      await apiFetch("/api/v1/student-profiles/complete", {
        method: "POST",
        body: JSON.stringify({ ...form, socialLinks }),
      });
      setStatus("pending");
      setMessage("Profile submitted for admin review.");
    } catch (error) {
      setMessage(error instanceof SyntaxError ? "Social links must be valid JSON." : error instanceof ApiError ? error.message : "We could not submit your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openPage = () => router.push(pageStatus === "none" ? "/page/new" : "/page");
  const signOut = () => {
    localStorage.removeItem("safecrib_access_token");
    localStorage.removeItem("safecrib_refresh_token");
    router.replace("/login");
  };
  const input = (field: keyof FormState, label: string, required = false) => (
    <label className="block text-sm font-medium text-safecrib-black">
      {label}{required ? " *" : ""}
      <input required={required} value={form[field]} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" />
    </label>
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} />
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        <Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link>
        <h1 className="mt-6 text-3xl font-medium text-safecrib-black">Your profile</h1>
        <div className="mt-4 rounded-[4px] border border-black/10 bg-white p-4 text-sm text-black/65">
          <p>Email: {user?.email ?? "Loading..."}</p>
          <p className="mt-1">Role: {user?.role ?? "Loading..."}</p>
          <p className="mt-1">Account review: <span className="font-medium uppercase">{status}</span></p>
          {rejectionReason && <p className="mt-2 text-red-700">Reason: {rejectionReason}</p>}
        </div>
        <form onSubmit={save} className="mt-8 grid gap-5 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)] sm:grid-cols-2">
          {input("displayName", "Display name", true)}
          {input("schoolOfStudy", "School of study", true)}
          {input("courseOfStudy", "Course of study", true)}
          {input("level", "Level", true)}
          {input("proofOfStudentship", "Proof of studentship reference", true)}
          {input("profilePicture", "Profile picture reference", true)}
          {input("dateOfBirth", "Date of birth")}
          {input("gender", "Gender")}
          {input("phoneNumber", "Phone number")}
          {input("emergencyContact", "Emergency contact")}
          <label className="block text-sm font-medium text-safecrib-black sm:col-span-2">Social links as JSON<textarea rows={3} value={form.socialLinks} onChange={(event) => update("socialLinks", event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" placeholder='{"linkedin":"...","website":"..."}' /></label>
          {message && <p className="sm:col-span-2 text-sm text-safecrib-green" role="status">{message}</p>}
          <div className="sm:col-span-2"><Button type="submit" loading={saving} disabled={status === "pending"}>Update and submit for review</Button></div>
        </form>
      </section>
    </main>
  );
}
