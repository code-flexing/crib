"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch, cachedApiFetch, cachedCurrentUser, cancelPendingUpload, clearClientCache, clearPendingUploads, getPendingUpload, getPendingUploads, isUnauthorizedError, normalizeAccountStatus, normalizePageStatus, uploadDocument, type AccountStatus, type PageStatus, type PendingUpload } from "@/lib/api";

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
  const [step, setStep] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [cancellingUpload, setCancellingUpload] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    void Promise.all([
      cachedCurrentUser<User>(),
      cachedApiFetch<StudentProfile | null>("/api/v1/student-profiles/me").catch(() => null),
      cachedApiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      cachedApiFetch<{ status?: string }>("/api/v1/provider-pages/me").catch(() => null),
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
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setError(uploadError instanceof Error ? uploadError.message : "We could not upload the studentship document."); }
    finally { setUploadingStudentship(false); }
  };
  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true); setError("");
    try { update("profilePicture", await uploadDocument(file, "AVATAR")); }
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setError(uploadError instanceof Error ? uploadError.message : "We could not upload the profile image."); }
    finally { setUploadingAvatar(false); }
  };
  const uploadCover = async (file: File) => {
    setUploadingCover(true); setError("");
    try { update("coverPhoto", await uploadDocument(file, "COVER_PHOTO")); }
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setError(uploadError instanceof Error ? uploadError.message : "We could not upload the cover photo."); }
    finally { setUploadingCover(false); }
  };

  const cancelUpload = async (id: string) => {
    setCancellingUpload(id);
    try { await cancelPendingUpload(id); setPendingUploads((current) => current.filter((upload) => upload.id !== id)); setError("Pending upload cancelled. You can upload the file again."); }
    catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : "We could not cancel that pending upload."); }
    finally { setCancellingUpload(null); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const proofOfStudentship = form.proofOfStudentship || getPendingUpload("PROOF_OF_STUDENTSHIP") || "";
    const profilePicture = form.profilePicture || getPendingUpload("AVATAR") || "";
    if (!proofOfStudentship || !profilePicture) {
      setStep(2);
      setError("Upload your studentship document and profile image before submitting.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/v1/student-profiles/complete", {
        method: "POST",
        body: JSON.stringify({ ...form, proofOfStudentship, profilePicture, socialLinks: { linkedin: form.linkedin, website: form.website } }),
      });
      clearClientCache("/api/v1/auth/me", "/api/v1/student-profiles/me", "/api/v1/student-profiles/status");
      clearPendingUploads();
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
  const input = (field: keyof FormState, label: string, required = false, type = "text") => (
    <label className="block text-sm font-medium text-safecrib-black">
      {label}{required ? " *" : ""}
      <input required={required} type={type} value={form[field] ?? ""} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" />
    </label>
  );
  const studentshipDocument = <label className="block text-sm font-medium text-safecrib-black"><span>Proof of studentship document *</span><input required={!form.proofOfStudentship} type="file" accept="application/pdf,image/*" disabled={uploadingStudentship} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStudentship(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.proofOfStudentship && <span className="mt-2 block text-xs font-normal text-safecrib-green">Document uploaded.</span>}</label>;
  const avatarInput = <label className="block text-sm font-medium text-safecrib-black"><span>Profile image *</span><input required={!form.profilePicture} type="file" accept="image/*" disabled={uploadingAvatar} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.profilePicture && <span className="mt-2 block text-xs font-normal text-safecrib-green">Profile image uploaded.</span>}</label>;
  const nextStep = () => setStep((current) => Math.min(current + 1, 4));
  const previousStep = () => setStep((current) => Math.max(current - 1, 0));
  const validate = () => {
    if (step === 1 && (!form.displayName || !form.schoolOfStudy || !form.courseOfStudy || !form.level)) {
      setError("Complete the required details before continuing.");
      return false;
    }
    setError("");
    return true;
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} />
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        <Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link>
        <h1 className="mt-6 text-3xl font-medium text-safecrib-black">Complete your student profile</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Submit your student details for admin review. Your account can browse homes while this is being reviewed.</p>
        {status === "pending" && <p className="mt-6 rounded-[4px] border border-black/10 bg-white p-4 text-sm text-black/65">Your profile is under review. You can update it after a decision.</p>}
        {status === "rejected" && <div className="mt-6 rounded-[4px] border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>Your profile was not approved. Update the details below and resubmit.</p>{rejectionReason && <p className="mt-2">Reason: {rejectionReason}</p>}</div>}
        {step === 0 ? <div className="mt-8 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Student profile</p><h2 className="mt-3 text-2xl font-medium text-safecrib-black">Set up your profile in four steps</h2><p className="mt-3 text-sm leading-6 text-black/60">Add your details, verification document, profile image, and contact information one step at a time.</p><Button type="button" className="mt-6" onClick={nextStep}>Start your profile</Button></div> : <form onSubmit={submit} className="mt-8 grid gap-5 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)] sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Step {step} of 4</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-safecrib-green transition-all" style={{ width: `${(step / 4) * 100}%` }} /></div></div>
          {step === 1 && <>{input("displayName", "Display name", true)}{input("schoolOfStudy", "School of study", true)}{input("courseOfStudy", "Course of study", true)}{input("level", "Level", true)}</>}
          {step === 2 && <>{studentshipDocument}{avatarInput}<label className="block text-sm font-medium text-safecrib-black"><span>Cover photo</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingCover} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.coverPhoto && <span className="mt-2 block text-xs font-normal text-safecrib-green">Cover photo uploaded.</span>}</label>{pendingUploads.length > 0 && <div className="sm:col-span-2 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Pending uploads</p><p className="mt-1">Cancel an unfinished upload before trying again.</p><div className="mt-3 space-y-2">{pendingUploads.map((upload) => <div key={upload.id} className="flex items-center justify-between gap-3"><span>{upload.purpose ?? "Upload"}</span><Button type="button" variant="secondary" className="px-3 py-2 text-xs" loading={cancellingUpload === upload.id} onClick={() => void cancelUpload(upload.id)}>Cancel</Button></div>)}</div></div>}</>}
          {step === 3 && <>{input("dateOfBirth", "Date of birth", false, "date")}{input("gender", "Gender")}{input("phoneNumber", "Phone number")}{input("emergencyContact", "Emergency contact")}</>}
          {step === 4 && <>{input("linkedin", "LinkedIn link")}{input("website", "Website link")}</>}
          {error && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{error}</p>}
          <div className="sm:col-span-2 flex items-center justify-between gap-3"><Button type="button" variant="secondary" onClick={previousStep}>Back</Button>{step < 4 ? <Button type="button" onClick={() => { if (step === 1 && !validate()) return; nextStep(); }}>Next</Button> : <Button type="submit" loading={saving || uploadingStudentship || uploadingAvatar || uploadingCover} disabled={status === "pending"}>{status === "rejected" ? "Update and resubmit" : "Submit for review"}</Button>}</div>
        </form>}
      </section>
    </main>
  );
}