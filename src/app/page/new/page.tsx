"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PageLoader } from "@/components/loading/PageLoader";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError, clearClientCache, normalizeAccountStatus, normalizePageStatus, unwrapData, uploadSignedMedia, waitForMediaReady, type AccountStatus, type PageStatus } from "@/lib/api";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";

type PayoutAccountForm = { provider: string; accountName: string; accountNumber: string };
type FormState = {
  displayName: string;
  description: string;
  phone: string;
  proofOfLicense: string;
  profilePicture: string;
  providerType: "AGENT" | "LANDLORD";
  businessName: string;
  businessAddress: string;
  additionalContactNumbers: string;
  linkedin: string;
  website: string;
  provider: string;
  accountName: string;
  accountNumber: string;
};
type ProviderPage = Partial<FormState> & {
  id?: string;
  status?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  reason?: string;
  socialLinks?: Record<string, string>;
  additionalContactNumbers?: string[];
  payoutAccounts?: { provider?: string; accountName?: string; accountNumber?: string } | { provider?: string; accountName?: string; accountNumber?: string }[];
} | null;
type User = { id?: string; email?: string; role?: string; displayName?: unknown };
type ProviderDraft = { form: FormState; step: number; additionalPayoutAccounts?: PayoutAccountForm[] };
const emptyPayoutAccount: PayoutAccountForm = { provider: "", accountName: "", accountNumber: "" };

const emptyForm: FormState = {
  displayName: "", description: "", phone: "", proofOfLicense: "", profilePicture: "", providerType: "AGENT",
  businessName: "", businessAddress: "", additionalContactNumbers: "", linkedin: "", website: "",
  provider: "", accountName: "", accountNumber: "",
};

function providerDraftKey(user: User) {
  return `safecrib:draft:provider-page:v1:${user.id ?? user.email ?? "current"}`;
}

function pageToForm(page: ProviderPage): FormState {
  if (!page) return emptyForm;
  const payout = Array.isArray(page.payoutAccounts) ? page.payoutAccounts[0] : page.payoutAccounts;
  return {
    ...emptyForm,
    ...page,
    providerType: page.providerType === "LANDLORD" ? "LANDLORD" : "AGENT",
    provider: payout?.provider ?? "",
    accountName: payout?.accountName ?? "",
    accountNumber: payout?.accountNumber ?? "",
    linkedin: page.socialLinks?.linkedin ?? "",
    website: page.socialLinks?.website ?? "",
    additionalContactNumbers: page.additionalContactNumbers?.join(", ") ?? "",
  };
}

function pageToPayoutAccounts(page: ProviderPage): PayoutAccountForm[] {
  if (!page?.payoutAccounts) return [];
  const payouts = Array.isArray(page.payoutAccounts) ? page.payoutAccounts : [page.payoutAccounts];
  return payouts.slice(1).map((payout) => ({
    provider: payout.provider ?? "",
    accountName: payout.accountName ?? "",
    accountNumber: payout.accountNumber ?? "",
  }));
}

export default function NewProviderPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [additionalPayoutAccounts, setAdditionalPayoutAccounts] = useState<PayoutAccountForm[]>([]);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("NONE");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [studentStatus, setStudentStatus] = useState<AccountStatus>("not_submitted");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"license" | "picture" | null>(null);
  const [confirmProviderConversion, setConfirmProviderConversion] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void Promise.all([
      apiFetch<unknown>("/api/v1/auth/me", { method: "POST" }).then((response) => unwrapData<User>(response)),
      apiFetch<unknown>("/api/v1/provider-pages/me").then((response) => unwrapData<ProviderPage>(response)).catch((loadError: unknown) => {
        if (loadError instanceof ApiError && loadError.status === 404) return null;
        throw loadError;
      }),
    ]).then(async ([user, providerPage]) => {
      setUser(user);
      const role = String(user.role ?? "").toUpperCase();
      if (role === "STUDENT") {
        const profileStatus = await apiFetch<unknown>("/api/v1/student-profiles/status").then(unwrapData<unknown>);
        setStudentStatus(normalizeAccountStatus(profileStatus));
      }
      const rawStatus = String(providerPage?.status ?? "NONE").toUpperCase();
      setStatus(rawStatus);
      setPageStatus(normalizePageStatus(rawStatus));
      setRejectionNotes(providerPage?.verificationNotes ?? providerPage?.rejectionReason ?? providerPage?.reason ?? "");
      if (["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(rawStatus)) { router.replace("/page"); return; }
      const key = providerDraftKey(user);
      setDraftKey(key);
      const draft = readDraft<ProviderDraft>(key);
      setForm({ ...pageToForm(providerPage), ...(draft?.form ?? {}) });
      setAdditionalPayoutAccounts(draft?.additionalPayoutAccounts ?? pageToPayoutAccounts(providerPage));
      setStep(draft?.step ?? 1);
      setRestored(Boolean(draft && !providerPage));
    }).catch((loadError: unknown) => {
      if (loadError instanceof ApiError && loadError.status === 401) router.replace("/login?reason=session-expired");
      else setError(loadError instanceof Error ? loadError.message : "We could not load provider setup.");
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!draftKey) return;
    const timeout = window.setTimeout(() => writeDraft<ProviderDraft>(draftKey, { form, step, additionalPayoutAccounts }), 400);
    return () => window.clearTimeout(timeout);
  }, [additionalPayoutAccounts, draftKey, form, step]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateAdditionalPayout = (index: number, field: keyof PayoutAccountForm, value: string) => setAdditionalPayoutAccounts((current) => current.map((account, accountIndex) => accountIndex === index ? { ...account, [field]: value } : account));
  const goToWorkspace = () => router.push("/page");

  const upload = async (file: File, kind: "license" | "picture") => {
    setUploading(kind);
    setError("");
    try {
      const purpose = kind === "license" ? "PROOF_OF_LICENSE" : "AVATAR";
      const uploaded = await uploadSignedMedia(file, purpose);
      if (uploaded.status !== "READY") await waitForMediaReady(uploaded.mediaId);
      update(kind === "license" ? "proofOfLicense" : "profilePicture", uploaded.mediaId);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : `We could not upload the ${kind === "license" ? "license document" : "profile picture"}.`);
    } finally { setUploading(null); }
  };

  const validateStep = (target: number) => {
    if (target === 1 && form.displayName.trim().length < 3) return "Page display name must be at least 3 characters.";
    if (target === 2 && (!form.proofOfLicense || !form.profilePicture)) return "Upload both your license proof and a profile picture before continuing.";
    if (target === 3) {
      const accounts = [{ provider: form.provider, accountName: form.accountName, accountNumber: form.accountNumber }, ...additionalPayoutAccounts];
      if (accounts.length > 10) return "Add no more than 10 payout accounts.";
      if (accounts.some((account) => !account.provider.trim() || !account.accountName.trim())) return "Add a provider and account name for every payout account.";
      if (accounts.some((account) => !/^\d{8,20}$/.test(account.accountNumber.trim()))) return "Every payout account number must contain 8 to 20 digits.";
    }
    return "";
  };

  const next = () => {
    setError("");
    setStep((current) => Math.min(current + 1, 3));
  };

  const submit = async (confirmedConversion = false) => {
    const invalidStep = [1, 2, 3].find((target) => validateStep(target));
    if (invalidStep) {
      setError(validateStep(invalidStep));
      setStep(invalidStep);
      return;
    }
    if (["SUBMITTED", "UNDER_REVIEW", "VERIFIED"].includes(status)) { setError("This provider Page has already been submitted or approved. Refresh its status before continuing."); return; }
    if (String(user?.role ?? "").toUpperCase() === "STUDENT" && !confirmedConversion) {
      setConfirmProviderConversion(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        displayName: form.displayName.trim(), description: form.description.trim(), phone: form.phone.trim(),
        proofOfLicense: form.proofOfLicense, profilePicture: form.profilePicture, providerType: form.providerType,
        businessName: form.businessName.trim(), businessAddress: form.businessAddress.trim(),
        additionalContactNumbers: form.additionalContactNumbers.split(",").map((number) => number.trim()).filter(Boolean),
        socialLinks: { linkedin: form.linkedin.trim(), website: form.website.trim() },
        payoutAccounts: [{ provider: form.provider.trim(), accountName: form.accountName.trim(), accountNumber: form.accountNumber.trim() }, ...additionalPayoutAccounts.map((account) => ({
          provider: account.provider.trim(), accountName: account.accountName.trim(), accountNumber: account.accountNumber.trim(),
        }))],
        ...(confirmedConversion ? { switchAccountToProvider: true } : {}),
      };
      if (status === "NONE") {
        const created = unwrapData<ProviderPage>(await apiFetch<unknown>("/api/v1/provider-pages", { method: "POST", body: JSON.stringify(payload) }));
        const nextStatus = String(created?.status ?? "DRAFT").toUpperCase();
        setStatus(nextStatus);
        setPageStatus(normalizePageStatus(nextStatus));
      } else {
        const updated = unwrapData<ProviderPage>(await apiFetch<unknown>("/api/v1/provider-pages/me", { method: "PATCH", body: JSON.stringify(payload) }));
        const nextStatus = String(updated?.status ?? "DRAFT").toUpperCase();
        setStatus(nextStatus);
        setPageStatus(normalizePageStatus(nextStatus));
      }
      await apiFetch("/api/v1/provider-pages/me/submit", { method: "POST" });
      clearClientCache("/api/v1/provider-pages/me");
      if (draftKey) removeDraft(draftKey);
      router.replace("/page");
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 409) setError("Your Page status changed while you were editing. Reload the provider workspace to see the latest state.");
      else if (submitError instanceof ApiError && submitError.status === 403) setError("Your account or provider Page is not eligible for this action. Refresh your status or contact support.");
      else setError(submitError instanceof Error ? submitError.message : "We could not submit your provider Page. Your draft is still saved.");
    } finally { setSaving(false); }
  };

  const discardDraft = () => {
    if (draftKey) removeDraft(draftKey);
    setForm(pageToForm(null));
    setAdditionalPayoutAccounts([]);
    setStep(1);
    setRestored(false);
    setError("");
  };

  if (loading) return <PageLoader label="Loading provider setup" />;

  const input = (field: keyof FormState, label: string, required = false, type = "text", maxLength?: number) => <label className="block text-sm font-medium text-safecrib-black">{label}{required ? " *" : ""}<input required={required} type={type} maxLength={maxLength} value={form[field]} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label>;

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
    <DashboardNav onCreatePage={goToWorkspace} pageStatus={pageStatus} />
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Link href="/page" className="text-sm font-medium text-safecrib-green hover:underline">Back to provider workspace</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-safecrib-green">Provider verification</p>
      <h1 className="mt-2 text-3xl font-medium text-safecrib-black">{status === "REJECTED" ? "Update your provider Page" : "Set up your provider Page"}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">Your Page verifies you as an agent or landlord. Home creation unlocks only after the review team approves it.</p>
      {status === "REJECTED" && <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><p>Your Page was not approved. Update the information and submit it again.</p>{rejectionNotes && <p className="mt-2">Review note: {rejectionNotes}</p>}</div>}
      {restored && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-safecrib-green/20 bg-[#EAF7F1] px-4 py-3 text-sm text-safecrib-green"><span>Draft restored. Your progress is saved on this device.</span><button type="button" onClick={discardDraft} className="font-medium underline">Discard draft</button></div>}
      {error && <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">{error}</p>}

      <form onSubmit={(event) => event.preventDefault()} noValidate className="mt-8 border border-black/10 bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-safecrib-green">Step {step} of 3</p><span className="text-xs text-black/45">{Math.round((step / 3) * 100)}%</span></div>
        <div className="mt-3 h-2 overflow-hidden bg-black/5"><div className="h-full bg-safecrib-green transition-[width] duration-300" style={{ width: `${(step / 3) * 100}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-black/45"><span className={step === 1 ? "font-semibold text-safecrib-green" : ""}>Profile</span><span className={step === 2 ? "font-semibold text-safecrib-green" : ""}>Verification</span><span className={step === 3 ? "font-semibold text-safecrib-green" : ""}>Payout and review</span></div>

        {step === 1 && <div className="mt-7 grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Provider type<select value={form.providerType} onChange={(event) => update("providerType", event.target.value as FormState["providerType"])} className="mt-2 w-full border border-black/15 bg-white px-4 py-3 font-normal"><option value="AGENT">Agent</option><option value="LANDLORD">Landlord</option></select></label>{input("displayName", "Page display name", true, "text", 120)}</div><div className="grid gap-5 sm:grid-cols-2">{input("businessName", "Business name")}{input("businessAddress", "Business address")}</div>{input("phone", "Phone number", false, "tel", 30)}{input("additionalContactNumbers", "Additional phone numbers (comma separated)")}<label className="block text-sm font-medium">Description<textarea maxLength={2000} rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} className="mt-2 w-full resize-y border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" placeholder="Tell students about your accommodation service" /><span className="mt-1 block text-right text-xs font-normal text-black/45">{form.description.length}/2,000</span></label></div>}

        {step === 2 && <div className="mt-7 grid gap-5"><div><h2 className="text-lg font-medium">Verification documents</h2><p className="mt-2 text-sm leading-6 text-black/55">Upload a license or business proof and a profile image. Sensitive proof documents are uploaded through the media service.</p></div><label className={`flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-black/20 p-5 text-center hover:border-safecrib-green ${uploading ? "pointer-events-none opacity-60" : ""}`}><span className="text-2xl text-safecrib-green">↑</span><span className="mt-2 text-sm font-medium">{uploading === "license" ? "Uploading license proof..." : form.proofOfLicense ? "License proof uploaded" : "Upload license proof *"}</span><span className="mt-1 text-xs text-black/50">PDF, JPEG, PNG, or WebP</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, "license"); }} className="sr-only" /></label>{form.proofOfLicense && <p className="text-xs text-safecrib-green">License document is ready to submit.</p>}<label className={`flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-black/20 p-5 text-center hover:border-safecrib-green ${uploading ? "pointer-events-none opacity-60" : ""}`}><span className="text-2xl text-safecrib-green">↑</span><span className="mt-2 text-sm font-medium">{uploading === "picture" ? "Uploading profile picture..." : form.profilePicture ? "Profile picture uploaded" : "Upload profile picture *"}</span><span className="mt-1 text-xs text-black/50">JPEG, PNG, WebP, or GIF</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file, "picture"); }} className="sr-only" /></label>{form.profilePicture && <p className="text-xs text-safecrib-green">Profile image is ready to submit.</p>}</div>}

        {step === 3 && <div className="mt-7 grid gap-5">
          <section aria-labelledby="payout-accounts-heading" className="grid gap-5">
            <div><h2 id="payout-accounts-heading" className="text-lg font-medium">Payout accounts</h2><p className="mt-2 text-sm leading-6 text-black/55">Add 1 to 10 payout destinations. Account numbers are kept as text so leading zeroes are preserved.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">{input("provider", "Bank or payment provider", true)}{input("accountName", "Account name", true)}</div>
            {input("accountNumber", "Account number", true, "text", 20)}
            {additionalPayoutAccounts.map((account, index) => <fieldset key={index} className="grid gap-4 border border-black/10 p-4">
              <legend className="px-1 text-sm font-medium">Payout account {index + 2}</legend>
              <div className="flex justify-end"><button type="button" onClick={() => setAdditionalPayoutAccounts((current) => current.filter((_, accountIndex) => accountIndex !== index))} className="text-sm font-medium text-red-700 hover:underline">Remove</button></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">Bank or payment provider *<input required maxLength={120} value={account.provider} onChange={(event) => updateAdditionalPayout(index, "provider", event.target.value)} className="mt-2 w-full border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label>
                <label className="block text-sm font-medium">Account name *<input required maxLength={120} value={account.accountName} onChange={(event) => updateAdditionalPayout(index, "accountName", event.target.value)} className="mt-2 w-full border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label>
              </div>
              <label className="block text-sm font-medium">Account number *<input required type="text" inputMode="numeric" maxLength={20} value={account.accountNumber} onChange={(event) => updateAdditionalPayout(index, "accountNumber", event.target.value)} className="mt-2 w-full border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label>
            </fieldset>)}
            {additionalPayoutAccounts.length < 9 && <Button type="button" variant="secondary" onClick={() => setAdditionalPayoutAccounts((current) => [...current, { ...emptyPayoutAccount }])}>Add payout account</Button>}
          </section>
          <div className="grid gap-5 sm:grid-cols-2">{input("linkedin", "LinkedIn link")}{input("website", "Website link")}</div>
          <div className="border-t border-black/10 pt-5"><h2 className="text-base font-medium">Ready to submit</h2><p className="mt-2 text-sm leading-6 text-black/55">Submitting sends your Page to admin review. You cannot edit it while it is pending. If rejected, you can update and resubmit.</p><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><dt className="text-black/50">Page name</dt><dd>{form.displayName || "Not set"}</dd><dt className="text-black/50">Provider type</dt><dd>{form.providerType}</dd><dt className="text-black/50">Payout accounts</dt><dd>{additionalPayoutAccounts.length + 1}</dd><dt className="text-black/50">License proof</dt><dd>{form.proofOfLicense ? "Ready" : "Missing"}</dd><dt className="text-black/50">Profile image</dt><dd>{form.profilePicture ? "Ready" : "Missing"}</dd></dl></div>
        </div>}

        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-black/10 pt-5"><div>{step > 1 && <Button type="button" variant="secondary" onClick={() => { setError(""); setStep((current) => current - 1); }}>Back</Button>}</div>{step < 3 ? <Button type="button" disabled={Boolean(uploading)} onClick={next}>Next</Button> : <Button type="button" loading={saving} disabled={Boolean(uploading)} onClick={() => void submit()}>{status === "REJECTED" ? "Update and submit for review" : "Submit Page for review"}</Button>}</div>
        <p className="mt-4 text-xs leading-5 text-black/45">Your details stay in this form while you move between sections. The Page is created and sent for review only when you choose the final submit action. Selecting a document starts its upload.</p>
      </form>
    </section>
    {confirmProviderConversion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="provider-conversion-title" className="w-full max-w-lg border border-black/10 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Account mode change</p>
        <h2 id="provider-conversion-title" className="mt-2 text-xl font-medium text-safecrib-black">Confirm provider verification</h2>
        <p className="mt-3 text-sm leading-6 text-black/65">Your student profile ({studentStatus.replaceAll("_", " ")}) will be retained, but student-only actions will be unavailable if your {form.providerType.toLowerCase()} Page is approved. Your active account mode changes only after provider review approval.</p>
        <p className="mt-3 text-sm leading-6 text-black/65">SafeCrib will record your consent with this Page submission. A pending or rejected Page does not grant provider permissions.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-black/10 pt-5">
          <Button type="button" variant="secondary" onClick={() => setConfirmProviderConversion(false)}>Cancel</Button>
          <Button type="button" loading={saving} onClick={() => { setConfirmProviderConversion(false); void submit(true); }}>Confirm and submit</Button>
        </div>
      </section>
    </div>}
  </main>;
}