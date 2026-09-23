"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Button } from "@/components/ui/Button";
import { apiFetch, normalizePageStatus, uploadDocument } from "@/lib/api";

type FormState = { displayName: string; description: string; phone: string; proofOfLicense: string; profilePicture: string; providerType: "AGENT" | "LANDLORD"; businessName: string; businessRegNumber: string; businessAddress: string; additionalContactNumbers: string; linkedin: string; website: string; provider: string; accountName: string; accountNumber: string };
type ExistingPage = Partial<FormState> & { status?: string; socialLinks?: Record<string, string>; additionalContactNumbers?: string[]; payoutAccounts?: { provider?: string; accountName?: string; accountNumber?: string } | { provider?: string; accountName?: string; accountNumber?: string }[] };
const emptyForm: FormState = { displayName: "", description: "", phone: "", proofOfLicense: "", profilePicture: "", providerType: "AGENT", businessName: "", businessRegNumber: "", businessAddress: "", additionalContactNumbers: "", linkedin: "", website: "", provider: "", accountName: "", accountNumber: "" };

export default function NewPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingRejectedPage, setEditingRejectedPage] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void apiFetch<ExistingPage>("/api/v1/provider-pages/me").then((page) => {
      const pageStatus = normalizePageStatus(page.status);
      if (pageStatus === "pending" || pageStatus === "approved") {
        router.replace("/page");
        return;
      }
      if (pageStatus === "rejected") {
        setEditingRejectedPage(true);
        const payout = Array.isArray(page.payoutAccounts) ? page.payoutAccounts[0] : page.payoutAccounts;
        setForm((current) => ({ ...current, ...page, provider: payout?.provider ?? "", accountName: payout?.accountName ?? "", accountNumber: payout?.accountNumber ?? "", linkedin: page.socialLinks?.linkedin ?? "", website: page.socialLinks?.website ?? "", additionalContactNumbers: page.additionalContactNumbers?.join(", ") ?? "" }));
      }
    }).catch(() => undefined);
  }, [router]);

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const uploadLicense = async (file: File) => {
    setUploadingLicense(true); setError("");
    try { update("proofOfLicense", await uploadDocument(file, "PROOF_OF_LICENSE")); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "We could not upload the license document."); }
    finally { setUploadingLicense(false); }
  };
  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true); setError("");
    try { update("profilePicture", await uploadDocument(file, "AVATAR")); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "We could not upload the profile image."); }
    finally { setUploadingAvatar(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { displayName: form.displayName, description: form.description, phone: form.phone, proofOfLicense: form.proofOfLicense, profilePicture: form.profilePicture, providerType: form.providerType, businessName: form.businessName, businessRegNumber: form.businessRegNumber, businessAddress: form.businessAddress, additionalContactNumbers: form.additionalContactNumbers.split(",").map((number) => number.trim()).filter(Boolean), socialLinks: { linkedin: form.linkedin, website: form.website }, payoutAccounts: [{ provider: form.provider, accountName: form.accountName, accountNumber: form.accountNumber }] };
      await apiFetch(editingRejectedPage ? "/api/v1/provider-pages/me" : "/api/v1/provider-pages", { method: editingRejectedPage ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await apiFetch("/api/v1/provider-pages/me/submit", { method: "POST" });
      router.replace("/page");
    } catch { setError(`We could not ${editingRejectedPage ? "update" : "create"} your Page. Complete all required fields and try again.`); }
    finally { setSaving(false); }
  };
  const signOut = () => { localStorage.removeItem("safecrib_access_token"); localStorage.removeItem("safecrib_refresh_token"); router.replace("/login"); };
  const input = (field: keyof FormState, label: string, required = false) => <label className="block text-sm font-medium text-safecrib-black"><span>{label}{required ? " *" : ""}</span><input required={required} value={String(form[field] ?? "")} onChange={(event) => update(field, event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal text-safecrib-black focus:border-safecrib-green focus:outline-none" /></label>;
  const documentInput = <label className="block text-sm font-medium text-safecrib-black"><span>Proof of license document *</span><input required={!form.proofOfLicense} type="file" accept="application/pdf,image/*" disabled={uploadingLicense} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLicense(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.proofOfLicense && <span className="mt-2 block text-xs font-normal text-safecrib-green">Document uploaded.</span>}</label>;
  const avatarInput = <label className="block text-sm font-medium text-safecrib-black"><span>Profile picture *</span><input required={!form.profilePicture} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingAvatar} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="mt-2 block w-full text-sm font-normal text-black/65" />{form.profilePicture && <span className="mt-2 block text-xs font-normal text-safecrib-green">Profile picture uploaded.</span>}</label>;

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8"><DashboardNav onCreatePage={() => router.push("/page/new")} onSignOut={signOut} pageStatus="none" /><section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8"><Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to home</Link><h1 className="mt-6 text-3xl font-medium text-safecrib-black">{editingRejectedPage ? "Update your Page" : "Create your Page"}</h1><p className="mt-3 text-sm leading-6 text-black/60">Submit your provider identity for review. Page approval is independent of your account approval.</p><form onSubmit={submit} className="mt-8 space-y-5 rounded-[12px] border border-black/10 bg-white p-6 shadow-[0_18px_40px_rgba(11,12,14,0.05)]"><label className="block text-sm font-medium">Provider type<select value={form.providerType} onChange={(event) => update("providerType", event.target.value)} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal"><option value="AGENT">Agent</option><option value="LANDLORD">Landlord</option></select></label>{input("displayName", "Page display name", true)}{input("businessName", "Business name")}{input("businessRegNumber", "Business registration number")}{input("businessAddress", "Business address")}{input("description", "Description")}{input("phone", "Phone")}{input("additionalContactNumbers", "Additional contact numbers (comma separated)")}{documentInput}{avatarInput}<div className="grid gap-5 sm:grid-cols-2">{input("linkedin", "LinkedIn link")}{input("website", "Website link")}</div><div className="border-t border-black/10 pt-5"><p className="text-sm font-medium text-safecrib-black">Payout account</p><div className="mt-4 grid gap-5 sm:grid-cols-3">{input("provider", "Provider", true)}{input("accountName", "Account name", true)}{input("accountNumber", "Account number", true)}</div></div>{error && <p className="text-sm text-red-600" role="alert">{error}</p>}<Button type="submit" loading={saving || uploadingLicense || uploadingAvatar}>{editingRejectedPage ? "Update and submit Page" : "Create and submit Page"}</Button></form></section></main>;
}