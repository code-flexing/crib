"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch, cachedApiFetch, cachedCurrentUser, cancelPendingUpload, clearClientCache, clearPendingUploads, displayName, getCachedCurrentUser, getPendingUpload, getPendingUploads, normalizeAccountStatus, normalizePageStatus, unwrapData, uploadDocument, type AccountStatus, type PageStatus, type PendingUpload } from "@/lib/api";
//y
type StudentProfile = {
  displayName?: string;
  proofOfStudentship?: string;
  schoolOfStudy?: string;
  courseOfStudy?: string;
  level?: string;
  profilePicture?: string;
  coverPhoto?: string;
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

const emptyForm: FormState = {
  displayName: "",
  proofOfStudentship: "",
  schoolOfStudy: "",
  courseOfStudy: "",
  level: "",
  profilePicture: "",
  coverPhoto: "",
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
  const [uploadingCover, setUploadingCover] = useState(false);
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
    }).catch(() => setMessage("We could not load your profile. Please try again."));
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
  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setMessage("");
    try { update("coverPhoto", await uploadDocument(file, "COVER_PHOTO")); }
    catch (uploadError) { if (uploadError instanceof ApiError && uploadError.status === 429) { setPendingUploads(await getPendingUploads().catch(() => [])); setStep(2); } setMessage(uploadError instanceof Error ? uploadError.message : "We could not upload the cover photo."); }
    finally { setUploadingCover(false); }
  };

  const cancelUpload = async (id: string) => {
    setCancellingUpload(id);
    try { await cancelPendingUpload(id); setPendingUploads((current) => current.filter((upload) => upload.id !== id)); setMessage("Pending upload cancelled. You can upload the file again."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "We could not cancel that pending upload."); }
    finally { setCancellingUpload(null); }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
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
      await apiFetch("/api/v1/student-profiles/complete", {
        method: "POST",
        body: JSON.stringify({
          displayName: form.displayName,
          proofOfStudentship,
          schoolOfStudy: form.schoolOfStudy,
          courseOfStudy: form.courseOfStudy,
          level: form.level,
          profilePicture,
          coverPhoto: form.coverPhoto,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phoneNumber: form.phoneNumber,
          emergencyContact: form.emergencyContact,
          socialLinks: { linkedin: form.linkedin, website: form.website },
        }),
      });
      clearClientCache("/api/v1/auth/me", "/api/v1/student-profiles/me", "/api/v1/student-profiles/status");
      clearPendingUploads();
      setStatus("pending");
      setMessage("Profile submitted for admin review.");
    } catch (error) {
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
  const avatarInput = <label className="block text-sm font-medium text-safecrib-black sm:col-span-2"><span>Profile image *</span><input required={!form.profilePicture} type="file" accept="image/*" disabled={uploadingAvatar} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.profilePicture && <span className="mt-2 block text-xs font-normal text-safecrib-green">Profile image uploaded.</span>}</label>;
  const coverInput = <label className="block text-sm font-medium text-safecrib-black sm:col-span-2"><span>Cover photo</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingCover} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.coverPhoto && <span className="mt-2 block text-xs font-normal text-safecrib-green">Cover photo uploaded.</span>}</label>;
  const studentshipDocument = <label className="block text-sm font-medium text-safecrib-black sm:col-span-2"><span>Proof of studentship document *</span><input required={!form.proofOfStudentship} type="file" accept="application/pdf,image/*" disabled={uploadingStudentship} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStudentship(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.proofOfStudentship && <span className="mt-2 block text-xs font-normal text-safecrib-green">Document uploaded.</span>}</label>;
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
        {step === 0 ? <div className="mt-8 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Profile update</p><h2 className="mt-3 text-2xl font-medium text-safecrib-black">Keep your details current</h2><p className="mt-3 text-sm leading-6 text-black/60">Move through four short steps to update your account and send the changes for review.</p><Button type="button" className="mt-6" onClick={nextStep}>Start profile update</Button></div> : <form onSubmit={save} className="mt-8 grid gap-5 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)] sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Step {step} of 3</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-safecrib-green transition-all" style={{ width: `${(step / 3) * 100}%` }} /></div></div>
          {step === 1 && <>{input("displayName", "Display name", true)}{input("schoolOfStudy", "School of study", true)}{input("courseOfStudy", "Course of study", true)}{input("level", "Level", true)}</>}
          {step === 2 && <>{studentshipDocument}{avatarInput}{coverInput}{pendingUploads.length > 0 && <div className="sm:col-span-2 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Pending uploads</p><p className="mt-1">Cancel an unfinished upload before trying again.</p><div className="mt-3 space-y-2">{pendingUploads.map((upload) => <div key={upload.id} className="flex items-center justify-between gap-3"><span>{upload.purpose ?? "Upload"}</span><Button type="button" variant="secondary" className="px-3 py-2 text-xs" loading={cancellingUpload === upload.id} onClick={() => void cancelUpload(upload.id)}>Cancel</Button></div>)}</div></div>}</>}
          {step === 3 && <>{input("dateOfBirth", "Date of birth", false, "date")}{input("gender", "Gender")}{input("phoneNumber", "Phone number")}{input("emergencyContact", "Emergency contact")}{input("linkedin", "LinkedIn link")}{input("website", "Website link")}</>}
          {message && <p className="sm:col-span-2 text-sm text-safecrib-green" role="status">{message}</p>}
          <div className="sm:col-span-2 flex items-center justify-between gap-3"><Button type="button" variant="secondary" onClick={previousStep}>Back</Button>{step < 3 ? <Button type="button" onClick={() => { if (step === 1 && !validate()) return; nextStep(); }}>Next</Button> : <Button type="submit" loading={saving || uploadingStudentship || uploadingAvatar || uploadingCover} disabled={status === "pending"}>Update and submit for review</Button>}</div>
        </form>}
      </section>
    </main>
  );
}
