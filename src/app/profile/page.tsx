"use client";

import Link from "next/link";
import { type DragEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch, cachedApiFetch, cachedCurrentUser, cancelPendingUpload, clearClientCache, clearPendingUploads, clearSession, displayName, getCachedCurrentUser, getPendingUpload, getPendingUploads, isUnauthorizedError, normalizeAccountStatus, normalizePageStatus, unwrapData, uploadDocument, type AccountStatus, type PageStatus, type PendingUpload } from "@/lib/api";

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

type User = { email?: string; role?: string; displayName?: unknown; studentProfileStatus?: unknown };
type ProviderPage = { status?: string } | null;
type FormState = Omit<StudentProfile, "status" | "rejectionReason" | "reason" | "socialLinks"> & { linkedin: string; website: string };

type UploadFieldProps = {
  title: string;
  description: string;
  format: string;
  accept: string;
  value?: string;
  uploading: boolean;
  required?: boolean;
  onUpload: (file: File) => void;
};

function UploadField({ title, description, format, accept, value, uploading, required = false, onUpload }: UploadFieldProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="min-w-0 rounded-[12px] border border-black/10 bg-[#FAFBF9] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${value ? "bg-[#EAF7F1] text-safecrib-green" : "bg-black/[0.05] text-black/55"}`} aria-hidden="true">{value ? "✓" : "↑"}</span>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-safecrib-black">{title}{required ? " *" : ""}</p>
          <p className="mt-1 text-xs leading-5 text-black/55">{value ? "Uploaded and ready to use." : description}</p>
        </div>
      </div>
      <label
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed px-5 py-7 text-center transition-colors ${dragging ? "border-safecrib-green bg-[#EAF7F1]" : "border-black/20 bg-white hover:border-safecrib-green hover:bg-[#F3FAF6]"} ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7F1] text-xl text-safecrib-green" aria-hidden="true">↑</span>
        <span className="mt-3 max-w-full break-words text-sm font-medium text-safecrib-black">{uploading ? "Uploading..." : value ? "Choose a different file" : "Drop your file here or browse"}</span>
        <span className="mt-1 max-w-full break-words text-xs leading-5 text-black/50">{format}</span>
        <input required={required && !value} type="file" accept={accept} disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} className="sr-only" />
      </label>
      {value && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-safecrib-green"><span aria-hidden="true">✓</span> File uploaded successfully</p>}
    </div>
  );
}

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
  linkedin: "",
  website: "",
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
  const [uploadingStudentship, setUploadingStudentship] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [step, setStep] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [cancellingUpload, setCancellingUpload] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    const cachedUser = getCachedCurrentUser<User>();
    if (cachedUser) setUser(cachedUser);

    void Promise.all([
      cachedCurrentUser<User>(),
      cachedApiFetch<unknown>("/api/v1/student-profiles/me").then((response) => unwrapData<StudentProfile | null>(response)).catch(() => null),
      cachedApiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      cachedApiFetch<unknown>("/api/v1/provider-pages/me").then((response) => unwrapData<ProviderPage>(response)).catch(() => null),
    ]).then(([currentUser, studentProfile, statusResponse, page]) => {
      const normalizedStatusResponse = unwrapData<unknown>(statusResponse);
      setUser(currentUser);
      setStatus(getStatus(currentUser, normalizedStatusResponse, studentProfile));
      setPageStatus(normalizePageStatus(page?.status));
      setRejectionReason(studentProfile?.rejectionReason ?? studentProfile?.reason ?? "");
      setForm({
        ...emptyForm,
        ...studentProfile,
        displayName: studentProfile?.displayName ?? displayName(currentUser.displayName),
        linkedin: studentProfile?.socialLinks?.linkedin ?? "",
        website: studentProfile?.socialLinks?.website ?? "",
      });
    }).catch((error: unknown) => {
      if (isUnauthorizedError(error)) {
        clearSession();
        router.replace("/login?reason=session-expired");
        return;
      }
      setMessage("We could not load your profile. Please try again.");
    });
  }, [router]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setMessage("");
    try { update("profilePicture", await uploadDocument(file, "AVATAR")); }
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setMessage(uploadError instanceof Error ? uploadError.message : "We could not upload the profile image."); }
    finally { setUploadingAvatar(false); }
  };
  const uploadStudentship = async (file: File) => {
    setUploadingStudentship(true);
    setMessage("");
    try { update("proofOfStudentship", await uploadDocument(file, "PROOF_OF_STUDENTSHIP")); }
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setMessage(uploadError instanceof Error ? uploadError.message : "We could not upload the studentship document."); }
    finally { setUploadingStudentship(false); }
  };
  const cancelUpload = async (id: string) => {
    setCancellingUpload(id);
    try { await cancelPendingUpload(id); setPendingUploads((current) => current.filter((upload) => upload.id !== id)); setMessage("Pending upload cancelled. You can upload the file again."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "We could not cancel that pending upload."); }
    finally { setCancellingUpload(null); }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (step !== 3) return;
    const proofOfStudentship = form.proofOfStudentship || getPendingUpload("PROOF_OF_STUDENTSHIP") || "";
    const profilePicture = form.profilePicture || getPendingUpload("AVATAR") || "";
    if (!proofOfStudentship || !profilePicture) {
      setStep(2);
      setMessage("Upload your studentship document and profile image before submitting.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const socialLinks = Object.fromEntries(
        Object.entries({ linkedin: form.linkedin, website: form.website }).filter(([, value]) => value.trim()),
      );
      await apiFetch("/api/v1/student-profiles/complete", {
        method: "POST",
        body: JSON.stringify({
          displayName: form.displayName,
          proofOfStudentship,
          schoolOfStudy: form.schoolOfStudy,
          courseOfStudy: form.courseOfStudy,
          level: form.level,
          profilePicture,
          ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
          ...(form.gender ? { gender: form.gender } : {}),
          ...(form.phoneNumber ? { phoneNumber: form.phoneNumber } : {}),
          ...(form.emergencyContact ? { emergencyContact: form.emergencyContact } : {}),
          ...(Object.keys(socialLinks).length > 0 ? { socialLinks } : {}),
        }),
      });
      clearClientCache("/api/v1/auth/me", "/api/v1/student-profiles/me", "/api/v1/student-profiles/status");
      clearPendingUploads();
      setStatus("pending");
      setMessage("Profile submitted for admin review.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearSession();
        router.replace("/login?reason=session-expired");
        return;
      }
      setMessage(error instanceof ApiError ? error.message : "We could not submit your profile. Please try again.");
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
      <input required={required} type={type} value={form[field]} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" />
    </label>
  );
  const avatarInput = <UploadField title="Profile image" description="Use a clear image so other users can recognize you." format="JPG, PNG, WebP, or GIF · max 10 MB" accept="image/*" value={form.profilePicture} uploading={uploadingAvatar} required onUpload={(file) => void uploadAvatar(file)} />;
  const studentshipDocument = <div className="sm:col-span-2"><UploadField title="Proof of studentship document" description="Upload a document that confirms your current student status." format="PDF or image · max 10 MB" accept="application/pdf,image/*" value={form.proofOfStudentship} uploading={uploadingStudentship} required onUpload={(file) => void uploadStudentship(file)} /></div>;
  const nextStep = () => setStep((current) => Math.min(current + 1, 3));
  const previousStep = () => setStep((current) => Math.max(current - 1, 0));
  const validate = () => {
    if (step === 1 && (!form.displayName || !form.schoolOfStudy || !form.courseOfStudy || !form.level)) {
      setMessage("Complete the required details before continuing.");
      return false;
    }
    setMessage("");
    return true;
  };

  const steps = ["Details", "Verification", "Contact"];

  return (
    <main className="min-h-screen bg-[#f7f8f5] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} />
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-safecrib-green transition-colors hover:text-[#0a5f47] hover:underline"><span aria-hidden="true">←</span> Back to home</Link>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-safecrib-green">Account settings</p>
            <h1 className="mt-3 font-display text-3xl italic text-safecrib-black sm:text-4xl">Your profile</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Keep your details current so the SafeCrib community knows who they are connecting with.</p>
          </div>
          <aside className="rounded-[14px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(11,12,14,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Account review</p>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${status === "rejected" ? "bg-red-50 text-red-700" : status === "pending" ? "bg-amber-50 text-amber-800" : "bg-[#eaf7f1] text-safecrib-green"}`}>{status.replace("_", " ")}</span>
            </div>
            <div className="mt-4 space-y-2 break-words border-t border-black/10 pt-4 text-sm text-black/60">
              <p><span className="text-black/40">Email</span><br />{user?.email ?? "Loading..."}</p>
              <p>Student</p>
            </div>
            {rejectionReason && <p className="mt-4 border-t border-red-100 pt-4 text-sm leading-5 text-red-700">{rejectionReason}</p>}
          </aside>
        </div>
        {step === 0 ? <div className="mt-8 overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-[0_20px_45px_rgba(11,12,14,0.06)]"><div className="border-b border-black/10 bg-[#eaf7f1] px-5 py-4 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Profile update</p></div><div className="p-5 sm:p-7"><h2 className="text-2xl font-medium text-safecrib-black sm:text-3xl">A better profile starts here.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Move through three short steps to update your details, verify your student status, and share your contact information.</p><div className="mt-7 grid gap-3 border-t border-black/10 pt-5 sm:grid-cols-3">{steps.map((label, index) => <div key={label} className="flex items-center gap-3 text-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf7f1] text-xs font-semibold text-safecrib-green">0{index + 1}</span><span className="text-black/65">{label}</span></div>)}</div><Button type="button" className="mt-7 w-full sm:w-auto" onClick={nextStep}>Start profile update <span aria-hidden="true">→</span></Button></div></div> : <form onSubmit={save} className="mt-8 grid min-w-0 gap-6 rounded-[16px] border border-black/10 bg-white p-5 shadow-[0_20px_45px_rgba(11,12,14,0.06)] sm:p-7 sm:grid-cols-2">
          <div className="sm:col-span-2"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Step {step} of 3</p><p className="mt-2 text-lg font-medium text-safecrib-black">{steps[step - 1]}</p></div><span className="text-sm font-medium text-black/40">{Math.round((step / 3) * 100)}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-safecrib-green transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black/35">{steps.map((label, index) => <span key={label} className={index < step ? "text-safecrib-green" : ""}>{label}</span>)}</div></div>
          {step === 1 && <>{input("displayName", "Display name", true)}{input("schoolOfStudy", "School of study", true)}{input("courseOfStudy", "Course of study", true)}{input("level", "Level", true)}</>}
          {step === 2 && <>{studentshipDocument}{avatarInput}{pendingUploads.length > 0 && <div className="sm:col-span-2 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Pending uploads</p><p className="mt-1">Cancel an unfinished upload before trying again.</p><div className="mt-3 space-y-2">{pendingUploads.map((upload) => <div key={upload.id} className="flex flex-col items-start gap-2 rounded-[6px] border border-amber-900/10 p-2 sm:flex-row sm:items-center sm:justify-between"><span className="break-all">{upload.purpose ?? "Upload"}</span><Button type="button" variant="secondary" className="px-3 py-2 text-xs" loading={cancellingUpload === upload.id} onClick={() => void cancelUpload(upload.id)}>Cancel</Button></div>)}</div></div>}</>}
          {step === 3 && <>{input("dateOfBirth", "Date of birth", false, "date")}{input("gender", "Gender")}{input("phoneNumber", "Phone number")}{input("emergencyContact", "Emergency contact")}{input("linkedin", "LinkedIn link")}{input("website", "Website link")}</>}
          {message && <p className="sm:col-span-2 text-sm text-safecrib-green" role="status">{message}</p>}
          <div className="sm:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={previousStep}>Back</Button>{step < 3 ? <Button type="button" className="w-full sm:w-auto" onClick={() => { if (step === 1 && !validate()) return; nextStep(); }}>Next</Button> : <Button type="submit" className="w-full sm:w-auto" loading={saving || uploadingStudentship || uploadingAvatar} disabled={status === "pending"}>Update and submit for review</Button>}</div>
        </form>}
      </section>
    </main>
  );
}
