"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError, adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function NewAdminPage() {
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      await adminFetch("/api/v1/admin/create", { method: "POST", body: JSON.stringify(form) });
      setSuccess("Admin account created successfully.");
      setForm({ email: "", password: "", displayName: "" });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) setError("That email is already registered.");
      else if (requestError instanceof ApiError && requestError.status === 403) setError("Only an administrator can create another admin.");
      else if (requestError instanceof ApiError && requestError.status === 429) setError("Too many requests. Try again later.");
      else setError(requestError instanceof ApiError ? requestError.message : "We could not create the admin account.");
    } finally { setSaving(false); }
  };

  return <div><Link href="/admin" className="text-sm font-medium text-safecrib-green hover:underline">Back to queue</Link><div className="mt-6 max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Admin accounts</p><h1 className="mt-2 text-3xl font-medium">Create an admin</h1><p className="mt-3 text-sm leading-6 text-black/60">Create a verified administrator account. There is no public admin signup.</p><form onSubmit={submit} className="mt-8 space-y-5 rounded-[8px] border border-black/10 bg-white p-6"><label className="block text-sm font-medium">Email<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label><label className="block text-sm font-medium">Display name<input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label><label className="block text-sm font-medium">Password<input required minLength={8} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/15 px-4 py-3 font-normal focus:border-safecrib-green focus:outline-none" /></label>{error && <p className="text-sm text-red-600" role="alert">{error}</p>}{success && <p className="text-sm text-safecrib-green" role="status">{success}</p>}<Button type="submit" loading={saving}>Create admin account</Button></form></div></div>;
}
