"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PageLoader } from "@/components/loading/PageLoader";
import { BackHomeLink } from "@/components/ui/BackHomeLink";
import { normalizeVerificationStage, VerificationBadge, type VerificationStageResult } from "@/components/verification/VerificationBadge";
import { cachedApiFetch, cachedCurrentUser, clearSession, displayName, getCachedCurrentUser, isUnauthorizedError, normalizeAccountStatus, resolveMediaUrl, unwrapData } from "@/lib/api";

type User = {
  id?: string;
  email?: string;
  displayName?: unknown;
  role?: string;
  profilePicture?: string;
  createdAt?: string;
  studentProfileStatus?: unknown;
  verificationStage?: unknown;
};

type StudentProfile = {
  displayName?: string;
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
} | null;

type ProviderPage = {
  displayName?: string;
  businessName?: string;
  providerType?: string;
  description?: string;
  profilePicture?: string;
  phone?: string;
  email?: string;
  businessAddress?: string;
  additionalContactNumbers?: string[];
  payoutAccounts?: Array<{ provider?: string; accountName?: string; accountNumber?: string }>;
  socialLinks?: Record<string, string>;
  status?: string;
  verifiedAt?: string;
} | null;

type Listing = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  discountedPrice?: number;
  status?: string;
  campus?: string;
  address?: string;
  createdAt?: string;
  photos?: Array<string | { url?: string }>;
};

function readable(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return <div className="min-w-0 border-t border-black/10 py-3 first:border-t-0"><dt className="text-xs font-medium uppercase tracking-[0.12em] text-black/45">{label}</dt><dd className="mt-1 break-words text-sm leading-6 text-safecrib-black">{value}</dd></div>;
}

function SafeLinks({ links }: { links?: Record<string, string> }) {
  const entries = Object.entries(links ?? {}).filter(([, value]) => typeof value === "string" && /^https?:\/\//i.test(value));
  if (entries.length === 0) return null;
  return <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4">{entries.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-safecrib-green hover:underline">{readable(label) || "Website"}</a>)}</div>;
}

function ListingGrid({ listings, own = false }: { listings: Listing[]; own?: boolean }) {
  if (listings.length === 0) return <p className="mt-5 rounded-xl border border-dashed border-black/15 bg-white px-5 py-8 text-center text-sm text-black/55">{own ? "Your homes and posts will appear here." : "There are no public posts to show yet."}</p>;
  return <div className="mt-5 grid gap-4 sm:grid-cols-2">
    {listings.map((listing) => {
      const photo = listing.photos?.[0];
      const image = typeof photo === "string" ? photo : photo?.url;
      return <article key={listing.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {image && <Image src={image} alt="" width={720} height={440} unoptimized className="h-44 w-full object-cover" />}
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-medium text-safecrib-black">{listing.title || "Untitled home"}</h3>
            {own && listing.status && <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs font-medium text-black/60">{readable(listing.status)}</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-black/55">{listing.description || "View this home for details."}</p>
          <p className="mt-3 font-semibold text-safecrib-black">{typeof (listing.discountedPrice ?? listing.price) === "number" ? `₦${(listing.discountedPrice ?? listing.price)?.toLocaleString()}` : "Price on request"}</p>
          <p className="mt-1 text-xs text-black/45">{listing.address || listing.campus || ""}</p>
          <Link href={`/dashboard/listings/${encodeURIComponent(listing.id)}`} className="mt-4 inline-flex text-sm font-semibold text-safecrib-green hover:underline">View home <span aria-hidden="true" className="ml-1">→</span></Link>
        </div>
      </article>;
    })}
  </div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentProfile>(null);
  const [provider, setProvider] = useState<ProviderPage>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationStageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    const cachedUser = getCachedCurrentUser<User>();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false);
    }

    let active = true;
    void cachedCurrentUser<User>().then(async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      const role = String(currentUser.role ?? "").toUpperCase();
      const verificationRequest = ["STUDENT", "AGENT", "LANDLORD", "ADMIN"].includes(role)
        ? cachedApiFetch<unknown>("/api/v1/trust/me/verification-stage")
            .then(normalizeVerificationStage)
            .catch((verificationError: unknown) => {
              if (active) setError(verificationError instanceof Error ? verificationError.message : "We could not load your verification badge.");
              return null;
            })
        : Promise.resolve(normalizeVerificationStage(currentUser.verificationStage));
      const isStudent = ["UNVERIFIED", "STUDENT"].includes(role);
      const isProvider = ["AGENT", "LANDLORD"].includes(role);
      const [studentProfile, providerPage, ownListings, verificationStage] = await Promise.all([
        isStudent
          ? cachedApiFetch<unknown>("/api/v1/student-profiles/me").then(unwrapData<StudentProfile>)
          : Promise.resolve(null),
        isProvider
          ? cachedApiFetch<unknown>("/api/v1/provider-pages/me").then(unwrapData<ProviderPage>)
          : Promise.resolve(null),
        isProvider
          ? cachedApiFetch<unknown>("/api/v1/listings/my").then(unwrapData<Listing[]>)
          : Promise.resolve([]),
        verificationRequest,
      ]);
      if (!active) return;
      setVerification(verificationStage);
      setStudent(studentProfile);
      setProvider(providerPage);
      setListings(Array.isArray(ownListings) ? ownListings : []);
      const picture = currentUser.profilePicture ?? studentProfile?.profilePicture ?? providerPage?.profilePicture;
      const resolvedPicture = await resolveMediaUrl(picture);
      if (active) setAvatarUrl(resolvedPicture);
    }).catch((loadError: unknown) => {
      if (isUnauthorizedError(loadError)) {
        clearSession();
        router.replace("/login?reason=session-expired");
        return;
      }
      if (active) setError(loadError instanceof Error ? loadError.message : "We could not load your profile.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  if (loading) return <PageLoader label="Loading your profile" />;

  const role = String(user?.role ?? "").toUpperCase();
  const studentStatus = normalizeAccountStatus(user?.studentProfileStatus);
  const name = displayName(user) || displayName(student) || displayName(provider) || "Your profile";
  const accountLabel = role === "UNVERIFIED" || role === "STUDENT" ? readable(studentStatus) : readable(role);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={() => router.push("/page/new")} pageStatus="none" canManagePage={["AGENT", "LANDLORD", "ADMIN"].includes(role)} />
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <BackHomeLink />
        <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-black/[0.08] bg-white shadow-[0_24px_60px_rgba(11,12,14,0.08)]" aria-labelledby="profile-heading">
          <div className="relative h-32 overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.45),transparent_30%),linear-gradient(120deg,#064e3b,#0b684c_52%,#b9dfc9)] sm:h-40">
            <div aria-hidden="true" className="absolute -right-8 -top-24 h-64 w-64 rounded-full border border-white/20" />
            <div aria-hidden="true" className="absolute -right-2 -top-16 h-48 w-48 rounded-full border border-white/15" />
            <span className="absolute bottom-4 right-5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">SafeCrib member</span>
          </div>
          <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:px-8">
            <ProfileAvatar src={avatarUrl} seed={user?.id ?? user?.email ?? "safecrib-member-avatar"} alt={`${name} profile`} size="large" className="-mt-14 border-4 border-white sm:-mt-16" />
            <div className="min-w-0 flex-1 sm:pb-1">
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 id="profile-heading" className="break-words font-display text-3xl font-bold text-safecrib-black sm:text-4xl">{name}</h1>
                {verification && <VerificationBadge verification={verification} compact iconOnly />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-safecrib-green/[0.08] px-3 py-1 text-xs font-semibold text-safecrib-green">{accountLabel}</span>
                {dateLabel(user?.createdAt) && <span className="text-xs text-black/45">Member since {dateLabel(user?.createdAt)}</span>}
              </div>
            </div>
            <Link href="/settings" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-safecrib-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a5f47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green">
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12.5 3.5 4 4M4 16l3.5-.7L16.7 6a1.7 1.7 0 0 0-2.4-2.4L5.1 12.8 4 16Z" /><path d="M3.5 18h13" /></svg>
              Edit profile
            </Link>
          </div>
        </section>

        {error && <p role="alert" className="mt-6 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_14px_36px_rgba(11,12,14,0.045)] sm:p-6" aria-labelledby="about-heading">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Your information</p>
            <h2 id="about-heading" className="mt-1 text-xl font-semibold text-safecrib-black">About you</h2>
            <dl className="mt-4">
              <Detail label="Email address" value={user?.email} />
              <Detail label="Account type" value={readable(role)} />
              <Detail label="Account status" value={accountLabel} />
              {student && <>
                <Detail label="School" value={student.schoolOfStudy} />
                <Detail label="Course of study" value={student.courseOfStudy} />
                <Detail label="Level" value={student.level} />
                <Detail label="Phone number" value={student.phoneNumber} />
                <Detail label="Gender" value={readable(student.gender)} />
                <Detail label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : ""} />
                <Detail label="Emergency contact" value={student.emergencyContact} />
              </>}
              {provider && <>
                <Detail label="Business name" value={provider.businessName} />
                <Detail label="Provider type" value={readable(provider.providerType)} />
                <Detail label="Contact number" value={provider.phone} />
                <Detail label="Business email" value={provider.email} />
                <Detail label="Business address" value={provider.businessAddress} />
                <Detail label="Additional contact numbers" value={provider.additionalContactNumbers?.join(", ")} />
              </>}
            </dl>
            {provider?.description && <p className="mt-3 border-t border-black/10 pt-4 text-sm leading-6 text-black/65">{provider.description}</p>}
            {provider?.payoutAccounts?.length ? <div className="mt-4 border-t border-black/10 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Payout accounts · private</h3>
              <ul className="mt-2 space-y-3">{provider.payoutAccounts.map((account, index) => <li key={`${account.provider ?? "account"}-${index}`} className="text-sm leading-6 text-black/65">{[account.provider, account.accountName, account.accountNumber].filter(Boolean).join(" · ")}</li>)}</ul>
            </div> : null}
            {student?.socialLinks && <div className="mt-4"><SafeLinks links={student.socialLinks} /></div>}
            {provider?.socialLinks && <div className="mt-4"><SafeLinks links={provider.socialLinks} /></div>}
          </section>

          <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_14px_36px_rgba(11,12,14,0.045)] sm:p-6" aria-labelledby="posts-heading">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Activity</p>
            <h2 id="posts-heading" className="mt-1 text-xl font-semibold text-safecrib-black">{["AGENT", "LANDLORD"].includes(role) ? "Your homes and posts" : "Your posts"}</h2>
            {["AGENT", "LANDLORD"].includes(role)
              ? <ListingGrid listings={listings} own />
              : <p className="mt-5 rounded-xl border border-dashed border-black/15 bg-[#fafbf9] px-5 py-8 text-center text-sm leading-6 text-black/55">Your activity and posts will appear here when you share them.</p>}
          </section>
        </div>

        {student && studentStatus !== "approved" && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
            <p className="text-sm leading-6 text-amber-900">Complete or update your student profile to finish account verification.</p>
            <Link href="/profile/complete" className="shrink-0 text-sm font-semibold text-amber-900 underline underline-offset-2">Update student profile</Link>
          </div>
        )}
      </section>
    </main>
  );
}
