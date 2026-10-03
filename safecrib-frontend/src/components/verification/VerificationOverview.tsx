"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch, cachedApiFetch, cachedCurrentUser, getCachedCurrentUser, primeCurrentUserCache, unwrapData } from "@/lib/api";
import { criterionLabel, normalizeVerificationStage, VerificationBadge, type VerificationStageResult } from "@/components/verification/VerificationBadge";

type Identity = { id?: string; identityVerified?: boolean; role?: string; trustScore?: number; verificationStage?: unknown };
type ProviderPage = { status?: string } | null;
type DiscoveryStats = { trustScore: number | null; activeDays: number; recommendationCount: number; followerCount: number; recommendationScore: number };
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
  const [verification, setVerification] = useState<VerificationStageResult | null>(() =>
    normalizeVerificationStage(getCachedCurrentUser<Identity>()?.verificationStage),
  );
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [identityVerified, setIdentityVerified] = useState<boolean | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [discoveryStats, setDiscoveryStats] = useState<DiscoveryStats | null>(null);
  const [discoveryError, setDiscoveryError] = useState("");
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");
    setDiscoveryError("");
    setEligible(null);
    let identity: Identity;
    try {
      const currentIdentity = unwrapData<Identity>(await (refresh
        ? apiFetch<unknown>("/api/v1/users/me")
        : cachedCurrentUser<Identity>()));
      identity = currentIdentity;
      if (refresh) primeCurrentUserCache(currentIdentity);
      const profileStage = normalizeVerificationStage(currentIdentity.verificationStage);
      if (profileStage) setVerification(profileStage);
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
    const fetch = refresh ? apiFetch : cachedApiFetch;
    const profileStage = normalizeVerificationStage(identity.verificationStage);
    const isProvider = ["AGENT", "LANDLORD"].includes(String(identity.role ?? "").toUpperCase());
    const results = await Promise.allSettled([
      profileStage && !refresh
        ? Promise.resolve(profileStage)
        : fetch<unknown>("/api/v1/trust/me/verification-stage"),
      fetch<unknown>("/api/v1/trust/me"),
      fetch<unknown>("/api/v1/provider-pages/me"),
      isProvider && identity.id
        ? fetch<unknown>(`/api/v1/trust/users/${encodeURIComponent(identity.id)}/discovery-stats`)
        : Promise.resolve(null),
    ]);

    const [stageResult, scoreResult, pageResult, discoveryResult] = results;
    if (stageResult.status === "rejected") {
      const cause = stageResult.reason;
      setError(cause instanceof ApiError && cause.status === 404
        ? "Verification stage is not available for this account yet."
        : cause instanceof Error ? cause.message : "We could not load verification details.");
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
    if (discoveryResult.status === "fulfilled" && discoveryResult.value) {
      setDiscoveryStats(unwrapData<DiscoveryStats>(discoveryResult.value));
    } else if (discoveryResult.status === "rejected" && isProvider) {
      setDiscoveryError(discoveryResult.reason instanceof Error
        ? discoveryResult.reason.message
        : "Provider discovery metrics could not be loaded.");
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
        <button type="button" onClick={() => void load(true)} disabled={loading} className="border border-black/15 px-3 py-2 text-sm font-medium text-safecrib-black disabled:opacity-50">{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      <div className="p-5 sm:p-7">
        {loading && !verification && <p className="text-sm text-black/55" role="status">Loading verification details...</p>}
        {error && <p role="alert" className="mb-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{error}</p>}
        {!loading && !error && eligible === false && <div className="border-l-4 border-black/20 bg-black/[0.03] px-4 py-3 text-sm leading-6 text-black/65"><p className="font-medium text-safecrib-black">Verification status is not available yet.</p><p className="mt-1">Complete student or provider verification first. Your badge will appear here when your account is eligible.</p></div>}
        {verification && <>
          {(() => {
            const completed = verification.criteria.filter((criterion) => criterion.met).length;
            const progress = verification.criteria.length ? Math.round(completed / verification.criteria.length * 100) : 0;
            return <div className="mb-7 flex flex-wrap items-center gap-5 rounded-xl border border-black/10 bg-[#f8faf8] p-5">
              <div className="relative grid h-24 w-24 shrink-0 place-items-center" role="img" aria-label={`Verification progress ${progress}%`}>
                <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#16845b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${progress * 2.6389} 263.89`} className="transition-all duration-700 ease-out" />
                </svg>
                <span className="text-xl font-semibold text-safecrib-black">{progress}%</span>
              </div>
              <div className="min-w-[12rem] flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-safecrib-green">Verification journey</p>
                <p className="mt-1 text-sm text-black/60">{completed} of {verification.criteria.length} applicable steps complete</p>
                <div className="mt-4 space-y-3">
                  {verification.criteria.map((criterion) => <div key={criterion.key}>
                    <div className="mb-1 flex justify-between gap-3 text-xs">
                      <span className="font-medium text-safecrib-black">{criterionLabel(criterion.key, criterion.label)}{criterion.required ? " (required)" : ""}</span>
                      <span className={criterion.met ? "text-safecrib-green" : "text-black/45"}>{criterion.met ? "Complete" : "In progress"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label={criterionLabel(criterion.key, criterion.label)} aria-valuenow={criterion.met ? 100 : 0} aria-valuemin={0} aria-valuemax={100}>
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${criterion.met ? "w-full bg-safecrib-green" : "w-0 bg-safecrib-green"}`} />
                    </div>
                  </div>)}
                </div>
              </div>
            </div>;
          })()}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs uppercase tracking-[0.14em] text-black/45">Current stage</p><div className="mt-2"><VerificationBadge verification={verification} compact /></div></div>
            <p className="text-sm text-black/55">{verification.stage.replaceAll("_", " ").toLowerCase()}</p>
          </div>
          {verification.riskBlocked && <p className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-[#7A4B00]">An account review is limiting badge upgrades. Your displayed badge remains at the standard verified level.</p>}

          <dl className="mt-6 grid gap-x-8 gap-y-5 border-y border-black/10 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Trust score</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{trustScore === null ? "Not established" : trustScore}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Identity verification</dt><dd className="mt-1 text-sm font-medium capitalize text-safecrib-black">{identityVerified === null ? "Not reported" : identityVerified ? "Verified" : "Not verified"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Provider Page</dt><dd className="mt-1 text-sm font-medium capitalize text-safecrib-black">{providerStatus ?? "Not available"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Fraud risk status</dt><dd className={`mt-1 text-sm font-medium ${verification.riskBlocked ? "text-[#7A4B00]" : "text-safecrib-black"}`}>{verification.riskBlocked ? "Review required" : "No badge block reported"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Next milestone</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{verification.nextMilestone ?? "No milestone remaining"}</dd></div>
            <div><dt className="text-xs uppercase tracking-[0.12em] text-black/45">Last updated</dt><dd className="mt-1 text-sm font-medium text-safecrib-black">{verification.generatedAt ? new Date(verification.generatedAt).toLocaleString() : "Not provided"}</dd></div>
          </dl>

          {discoveryStats && <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
              <div><h3 className="text-base font-semibold text-safecrib-black">Provider discovery signals</h3><p className="mt-1 text-xs text-black/50">Signals used to rank homes for students; activity and recommendations use the last 30 days and all-time totals.</p></div>
              <p className="text-2xl font-semibold text-safecrib-green">{discoveryStats.recommendationScore}<span className="text-sm font-normal text-black/45"> / 100</span></p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Trust score", value: discoveryStats.trustScore ?? 0, max: 100, display: discoveryStats.trustScore === null ? "Not established" : `${discoveryStats.trustScore}%` },
                { label: "Active days", value: discoveryStats.activeDays, max: 30, display: `${discoveryStats.activeDays} / 30 days` },
                { label: "Student recommendations", value: discoveryStats.recommendationCount, max: 50, display: String(discoveryStats.recommendationCount) },
                { label: "Followers", value: discoveryStats.followerCount, max: 10, display: String(discoveryStats.followerCount) },
              ].map((metric) => <div key={metric.label} className="rounded-lg border border-black/10 p-4">
                <div className="flex justify-between gap-2 text-xs"><span className="text-black/55">{metric.label}</span><span className="font-semibold text-safecrib-black">{metric.display}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label={metric.label} aria-valuenow={Math.min(100, metric.value / metric.max * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-safecrib-green transition-all duration-700 ease-out" style={{ width: `${Math.min(100, metric.value / metric.max * 100)}%` }} />
                </div>
              </div>)}
            </div>
            <p className="mt-3 text-xs text-black/45">Reply speed will be added when student inquiries can be tracked inside SafeCrib.</p>
          </>}
          {discoveryError && <p role="alert" className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">{discoveryError}</p>}
          <p className="mt-4 text-xs text-black/45">Badge stage and risk state are supplied by SafeCrib. The app does not calculate a badge from trust score.</p>
        </>}
      </div>
    </section>
  );
}
