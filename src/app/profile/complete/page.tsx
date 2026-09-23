"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { apiFetch, isUnauthorizedError, normalizeAccountStatus, normalizePageStatus, uploadDocument, type AccountStatus, type PageStatus } from "@/lib/api";

type StudentProfile = {
  displayName?: string;
  schoolOfStudy?: string;
  courseOfStudy?: string;
  level?: string;
  profilePicture?: string;
  coverPhoto?: string;
  proofOfStudentship?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  socialLinks?: Record<string, string>;
  status?: string;
  rejectionReason?: string;
  reason?: string;
};

type User = { displayName?: string; studentProfileStatus?: unknown; role?: string };
type FormState = Omit<StudentProfile, "status" | "rejectionReason" | "reason" | "socialLinks"> & { linkedin: string; website: string };

const emptyForm: FormState = {
  displayName: "",
  schoolOfStudy: "",
  courseOfStudy: "",
  level: "",
  profilePicture: "",
  coverPhoto: "",
  proofOfStudentship: "",
  dateOfBirth: "",
  gender: "",
  phoneNumber: "",
  emergencyContact: "",
  linkedin: "",
  website: "",
};

export default function CompleteStudentProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<AccountStatus>("not_submitted");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingStudentship, setUploadingStudentship] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    void Promise.all([
      apiFetch<User>("/api/v1/users/me"),
      apiFetch<StudentProfile | null>("/api/v1/student-profiles/me").catch(() => null),
      apiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      apiFetch<{ status?: string }>("/api/v1/provider-pages/me").catch(() => null),
    ]).then(([user, studentProfile, statusResponse, page]) => {
      const rawStatus = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
        ? user.studentProfileStatus.status
        : statusResponse && typeof statusResponse === "object" && "status" in statusResponse ? statusResponse.status : statusResponse;
      setStatus(normalizeAccountStatus(rawStatus));
      setPageStatus(normalizePageStatus(page?.status));
      if (studentProfile) {
        setForm((current) => ({ ...current, ...studentProfile, linkedin: studentProfile.socialLinks?.linkedin ?? "", website: studentProfile.socialLinks?.website ?? "" }));
        setRejectionReason(studentProfile.rejectionReason ?? studentProfile.reason ?? "");
      }
    }).catch((loadError: unknown) => {
      if (isUnauthorizedError(loadError)) {
        localStorage.removeItem("safecrib_access_token");
        localStorage.removeItem("safecrib_refresh_token");
        router.replace("/login?reason=session-expired");
        return;
      }
      setStatus("not_submitted");
      setPageStatus("none");
    });
  }, [router]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const uploadStudentship = async (file: File) => {
    setUploadingStudentship(true); setError("");
    try { update("proofOfStudentship", await uploadDocument(file, "PROOF_OF_STUDENTSHIP")); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "We could not upload the studentship document."); }
    finally { setUploadingStudentship(false); }
  };
  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true); setError("");
    try { update("profilePicture", await uploadDocument(file, "AVATAR")); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "We could not upload the profile image."); }
    finally { setUploadingAvatar(false); }
  };
  const uploadCover = async (file: File) => {
    setUploadingCover(true); setError("");
    try { update("coverPhoto", await uploadDocument(file, "COVER_PHOTO")); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "We could not upload the cover photo."); }
    finally { setUploadingCover(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/v1/student-profiles/complete", {
        method: "POST",
        body: JSON.stringify({ ...form, socialLinks: { linkedin: form.linkedin, website: form.website } }),
      });
      router.replace("/dashboard");
    } catch {
      setError("We could not submit your profile for review. Check the required fields and try again.");
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
      <input required={required} value={form[field] ?? ""} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" />
    </label>
  );
  const studentshipDocument = <label className="block text-sm font-medium text-safecrib-black"><span>Proof of studentship document *</span><input required={!form.proofOfStudentship} type="file" accept="application/pdf,image/*" disabled={uploadingStudentship} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStudentship(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.proofOfStudentship && <span className="mt-2 block text-xs font-normal text-safecrib-green">Document uploaded.</span>}</label>;
  const avatarInput = <label className="block text-sm font-medium text-safecrib-black"><span>Profile image *</span><input required={!form.profilePicture} type="file" accept="image/*" disabled={uploadingAvatar} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.profilePicture && <span className="mt-2 block text-xs font-normal text-safecrib-green">Profile image uploaded.</span>}</label>;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} />
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        <Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link>
        <h1 className="mt-6 text-3xl font-medium text-safecrib-black">Complete your student profile</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Submit your student details for admin review. Your account can browse homes while this is being reviewed.</p>
        {status === "pending" && <p className="mt-6 rounded-[4px] border border-black/10 bg-white p-4 text-sm text-black/65">Your profile is under review. You can update it after a decision.</p>}
        {status === "rejected" && <div className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>Your profile was not approved. Update the details below and resubmit.</p>{rejectionReason && <p className="mt-2">Reason: {rejectionReason}</p>}</div>}
        <form onSubmit={submit} className="mt-8 grid gap-5 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)] sm:grid-cols-2">
          {input("displayName", "Display name", true)}
          {input("schoolOfStudy", "School of study", true)}
          {input("courseOfStudy", "Course of study", true)}
          {input("level", "Level", true)}
          {studentshipDocument}
          {avatarInput}
          <label className="block text-sm font-medium text-safecrib-black"><span>Cover photo</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingCover} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.coverPhoto && <span className="mt-2 block text-xs font-normal text-safecrib-green">Cover photo uploaded.</span>}</label>
          {input("dateOfBirth", "Date of birth")}
          {input("gender", "Gender")}
          {input("phoneNumber", "Phone number")}
          {input("emergencyContact", "Emergency contact")}
          {input("linkedin", "LinkedIn link")}
          {input("website", "Website link")}
          {error && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit" loading={saving || uploadingStudentship || uploadingAvatar || uploadingCover} disabled={status === "pending"}>{status === "rejected" ? "Update and resubmit" : "Submit for review"}</Button></div>
        </form>
      </section>
    </main>
  );
}