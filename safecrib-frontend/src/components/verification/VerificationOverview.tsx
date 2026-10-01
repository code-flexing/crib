"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch, unwrapData } from "@/lib/api";
import { criterionLabel, normalizeVerificationStage, VerificationBadge, type VerificationStageResult } from "@/components/verification/VerificationBadge";

type Identity = { identityVerified?: boolean; role?: string; trustScore?: number };
type ProviderPage = { status?: string } | null;
const verificationRoles = new Set(["STUDENT", "AGENT", "LANDLORD", "ADMIN"]);

function getTrustScore(value: unknown) {
  const response = unwrapData<unknown>(value);
  if (typeof response === "number" && Number.isFinite(response)) return response;
  if (typeof response !== "object" || response === null) return null;
  const record = response as Record<string, unknown>;
  const score = record.trustScore ?? record.score;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function identityState(identity: Identity, verification: VerificationStageResult) {
  if (typeof identity.identityVerified === "boolean") return identity.identityVerified;
  return verification.criteria.find((criterion) => criterion.key === "identity")?.met ?? null;
}

export function VerificationOverview() {
  const [verification, setVerification] = useState<VerificationStageResult | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [identityVerified, setIdentityVerified] = useState<boolean | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setEligible(null);
    let identity: Identity;
    try {
      identity = unwrapData<Identity>(await apiFetch<unknown>("/api/v1/auth/me", { method: "POST" }));
    } catch (identityError) {
      setError(identityError instanceof Error ? identityError.message : "We could not load your account status.");
      setVerification(null);
      setLoading(false);
      return;
    }

    if (!verificationRoles.has(String(identity.role ?? "").toUpperCase())) {
      setEligible(false);
      setVerification(null);
      setTrustScore(null);
      setIdentityVerified(typeof identity.identityVerified === "boolean" ? identity.identityVerified : null);
      setProviderStatus(null);
      setLoading(false);
      return;
    }

    setEligible(true);
    const results = await Promise.allSettled([
      apiFetch<unknown>("/api/v1/trust/me/verification-stage"),
      apiFetch<unknown>("/api/v1/trust/me"),
      apiFetch<unknown>("/api/v1/provider-pages/me"),
    ]);

    const [stageResult, scoreResult, pageResult] = results;
    if (stageResult.status === "rejected") {
      const cause = stageResult.reason;
      setError(cause instanceof ApiError && cause.status === 404
        ? "Verification stage is not available for this account yet."
        : cause instanceof Error ? cause.message : "We could not load verification details.");
      setVerification(null);
      setLoading(false);
      return;
    }

    const stage = normalizeVerificationStage(stageResult.value);
    if (!stage) {
      setError("The API returned an unrecognized verification stage. No badge was inferred.");
      setVerification(null);
      setLoading(false);
      return;
    }

    setVerification(stage);
    if (scoreResult.status === "fulfilled") setTrustScore(getTrustScore(scoreResult.value));
    setIdentityVerified(identityState(identity, stage));
    if (typeof identity.trustScore === "number") setTrustScore(identity.trustScore);
    if (pageResult.status === "fulfilled") {
      const page = unwrapData<ProviderPage>(pageResult.value);
      setProviderStatus(page?.status ? page.status.replaceAll("_", " ").toLowerCase() : "not set up");
    } else if (pageResult.reason instanceof ApiError && pageResult.reason.status === 404) {
      setProviderStatus("not set up");
    } else {
      setProviderStatus(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section aria-labelledby="verification-overview-title" className="mt-8 border border-black/10 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Account security</p>
          <h2 id="verification-overview-title" className="mt-1 text-xl font-medium text-safecrib-black">Verification status</h2>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="border border-black/15 px-3 py-2 text-sm font-medium text-safecrib-black disabled:opacity-50">{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      <div className="p-5 sm:p-7">
        {loading && !verification && <p className="text-sm text-black/55" role="status">Loading verification details...</p>}
        {error && <p role="alert" className="mb-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{error}</p>}
        {!loading && !error && eligible === false && <div className="border-l-4 border-black/20 bg-black/[0.03] px-4 py-3 text-sm leading-6 text-black/65"><p className="font-medium text-safecrib-black">Verification status is not available yet.</p><p className="mt-1">Complete student or provider verification first. Your badge will appear here when your account is eligible.</p></div>}
        {verification && <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs uppercase tracking-[0.14em] text-black/45">Current stage</p><div className="mt-2"><VerificationBadge verification={verification} /></div></div>
            <p className="text-sm text-black/55">{verification.stage.replaceAll("_", " ").toLowerCase()}</p>
          </div>
          {verification.riskBlocked && <p className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-[#7A4B00]">An account review is limiting badge upgrades. Your displayed badge remains at the standard verified level.</p>}

          <dl className="mt-6 grid gap-x-8 gap-y-5 border-y border-black/10 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Trust score</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{trustScore === null ? "Not available" : trustScore}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Identity verification</dt><dd className="mt-1 text-sm font-medium capitalize text-safecrib-black">{identityVerified === null ? "Not reported" : identityVerified ? "Verified" : "Not verified"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Provider Page</dt><dd className="mt-1 text-sm font-medium capitalize text-safecrib-black">{providerStatus ?? "Not available"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Fraud risk status</dt><dd className={`mt-1 text-sm font-medium ${verification.riskBlocked ? "text-[#7A4B00]" : "text-safecrib-black"}`}>{verification.riskBlocked ? "Review required" : "No badge block reported"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Next milestone</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{verification.nextMilestone ?? "No milestone remaining"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Last updated</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{verification.generatedAt ? new Date(verification.generatedAt).toLocaleString() : "Not provided"}</dd></div>
          </dl>

          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-safecrib-green">Verification criteria</summary>
            {verification.criteria.length ? <ul className="mt-3 divide-y divide-black/10 border-y border-black/10">{verification.criteria.map((criterion) => <li key={criterion.key} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{criterionLabel(criterion.key, criterion.label)}{criterion.required ? " (required)" : ""}</span><span className={criterion.met ? "font-medium text-[#0B3D1E]" : "text-black/50"}>{criterion.met ? "Met" : "Not met"}</span></li>)}</ul> : <p className="mt-3 text-sm text-black/55">Criteria were not included in the API response.</p>}
          </details>
          <p className="mt-4 text-xs text-black/45">Badge stage and risk state are supplied by SafeCrib. The app does not calculate a badge from trust score.</p>
        </>}
      </div>
    </section>
  );
}
