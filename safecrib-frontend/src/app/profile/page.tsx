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
  followerCount?: number;
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
  likeCount?: number;
  viewCount?: number;
};
type StudentEngagement = { totalInteractions: number; follows: number; likes: number; comments: number; recommendations: number };
type ProviderStats = { trustScore: number | null; recommendationCount: number; followerCount: number; activeDays: number };

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

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 border-l border-white/15 pl-4 first:border-l-0 first:pl-0">
    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</p>
    <p className="mt-1 truncate text-lg font-semibold text-white">{value}</p>
  </div>;
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
          {listing.status === "VERIFIED" && <p className="mt-2 text-xs text-black/50">{listing.viewCount ?? 0} views · {listing.likeCount ?? 0} likes</p>}
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
  const [studentEngagement, setStudentEngagement] = useState<StudentEngagement | null>(null);
  const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
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
      setVerification(normalizeVerificationStage(cachedUser.verificationStage));
      setLoading(false);
    }

    let active = true;
    void cachedCurrentUser<User>().then(async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      const currentStage = normalizeVerificationStage(currentUser.verificationStage);
      if (currentStage) setVerification(currentStage);
      const role = String(currentUser.role ?? "").toUpperCase();
      const verificationRequest = ["STUDENT", "AGENT", "LANDLORD", "ADMIN"].includes(role)
        ? cachedApiFetch<unknown>("/api/v1/trust/me/verification-stage")
            .then(normalizeVerificationStage)
            .catch(() => null)
        : Promise.resolve(normalizeVerificationStage(currentUser.verificationStage));
      void verificationRequest.then((stage) => {
        if (active && stage) setVerification(stage);
      });
      const isStudent = ["UNVERIFIED", "STUDENT"].includes(role);
      const isProvider = ["AGENT", "LANDLORD"].includes(role);
      const [studentProfile, providerPage, ownListings, studentStats, providerDiscovery] = await Promise.all([
        isStudent
          ? cachedApiFetch<unknown>("/api/v1/student-profiles/me").then(unwrapData<StudentProfile>)
          : Promise.resolve(null),
        isProvider
          ? cachedApiFetch<unknown>("/api/v1/provider-pages/me").then(unwrapData<ProviderPage>)
          : Promise.resolve(null),
        isProvider
          ? cachedApiFetch<unknown>("/api/v1/listings/my").then(unwrapData<Listing[]>)
          : Promise.resolve([]),
        role === "STUDENT"
          ? cachedApiFetch<unknown>("/api/v1/users/me/engagement-stats").then(unwrapData<StudentEngagement>).catch(() => null)
          : Promise.resolve(null),
        isProvider && currentUser.id
          ? cachedApiFetch<unknown>(`/api/v1/trust/users/${encodeURIComponent(currentUser.id)}/discovery-stats`).then(unwrapData<ProviderStats>).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (!active) return;
      setStudent(studentProfile);
      setProvider(providerPage);
      setListings(Array.isArray(ownListings) ? ownListings : []);
      setStudentEngagement(studentStats);
      setProviderStats(providerDiscovery);
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
    <main className="min-h-screen bg-[#f2f5f3] pb-24 md:pb-8">
      <DashboardNav onCreatePage={() => router.push("/page/new")} pageStatus="none" canManagePage={["AGENT", "LANDLORD", "ADMIN"].includes(role)} />
      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <BackHomeLink />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-black/40 sm:block">Trust profile</span>
        </div>
        <section className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-[#123b2f] shadow-[0_26px_70px_rgba(10,54,40,0.2)]" aria-labelledby="profile-heading">
          <div className="relative min-h-52 overflow-hidden px-5 pb-7 pt-6 sm:min-h-64 sm:px-8 sm:pt-8">
            <div aria-hidden="true" className="absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/15" />
            <div aria-hidden="true" className="absolute -right-2 -top-16 h-52 w-52 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[#7bd6ad]/10 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#a8e7cb]">SafeCrib</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/65">A profile built around evidence, identity, and safer homes.</p>
              </div>
              {verification && <VerificationBadge verification={verification} compact />}
            </div>
            <span className="absolute bottom-5 right-5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">Member profile</span>
          </div>
          <div className="relative border-t border-white/10 bg-white px-5 pb-6 sm:px-8 sm:pb-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <ProfileAvatar src={avatarUrl} seed={user?.id ?? user?.email ?? "safecrib-member-avatar"} alt={`${name} profile`} size="large" className="-mt-16 border-8 border-[#123b2f] sm:-mt-20" />
              <div className="min-w-0 flex-1 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id="profile-heading" className="break-words font-display text-3xl font-bold tracking-tight text-safecrib-black sm:text-4xl">{name}</h1>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-safecrib-green/[0.1] px-3 py-1 text-xs font-semibold text-safecrib-green">{accountLabel}</span>
                  {dateLabel(user?.createdAt) && <span className="text-xs text-black/45">Member since {dateLabel(user?.createdAt)}</span>}
                </div>
              </div>
              <Link href="/settings" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-safecrib-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a5f47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12.5 3.5 4 4M4 16l3.5-.7L16.7 6a1.7 1.7 0 0 0-2.4-2.4L5.1 12.8 4 16Z" /><path d="M3.5 18h13" /></svg>
                Edit profile
              </Link>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-[#123b2f] px-4 py-4 sm:grid-cols-4 sm:px-5">
              <ProfileStat label="Trust stage" value={verification ? readable(verification.stage) : "Building"} />
              <ProfileStat label="Followers" value={providerStats?.followerCount ?? user?.followerCount ?? 0} />
              <ProfileStat label={role === "STUDENT" ? "Interactions" : "Homes"} value={role === "STUDENT" ? studentEngagement?.totalInteractions ?? 0 : listings.length} />
              <ProfileStat label="Account" value={readable(role) || "Member"} />
            </div>
          </div>
        </section>

        {error && <p role="alert" className="mt-6 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="about-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">The person behind the profile</p>
              <div className="mt-2 flex items-end justify-between gap-4 border-b border-black/10 pb-4">
                <h2 id="about-heading" className="font-display text-2xl font-bold tracking-tight text-safecrib-black">About you</h2>
                <span className="text-xs font-medium text-black/40">Private account details</span>
              </div>
              <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
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
              {provider?.description && <p className="mt-5 max-w-2xl border-l-2 border-safecrib-green/35 pl-4 text-sm leading-7 text-black/65">{provider.description}</p>}
              {provider?.payoutAccounts?.length ? <div className="mt-5 border-t border-black/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Payout accounts · private</h3>
                <ul className="mt-2 space-y-2">{provider.payoutAccounts.map((account, index) => <li key={`${account.provider ?? "account"}-${index}`} className="text-sm leading-6 text-black/65">{[account.provider, account.accountName, account.accountNumber].filter(Boolean).join(" · ")}</li>)}</ul>
              </div> : null}
              {student?.socialLinks && <div className="mt-5"><SafeLinks links={student.socialLinks} /></div>}
              {provider?.socialLinks && <div className="mt-5"><SafeLinks links={provider.socialLinks} /></div>}
            </section>

            <section aria-labelledby="posts-heading">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Activity</p>
              <div className="mt-2 flex items-end justify-between gap-4 border-b border-black/10 pb-4">
                <h2 id="posts-heading" className="font-display text-2xl font-bold tracking-tight text-safecrib-black">{["AGENT", "LANDLORD"].includes(role) ? "Your homes and posts" : "Your posts"}</h2>
                <span className="text-xs font-medium text-black/40">Visible activity</span>
              </div>
              {["AGENT", "LANDLORD"].includes(role)
                ? <ListingGrid listings={listings} own />
                : <div className="mt-5 border border-dashed border-black/15 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-safecrib-green/10 text-xl text-safecrib-green">+</div><p className="mt-4 text-sm font-medium text-safecrib-black">Your activity starts here</p><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-black/50">Your saved homes, recommendations, and posts will gather here as you use SafeCrib.</p></div>}
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-[1.5rem] bg-[#123b2f] p-6 text-white shadow-[0_18px_45px_rgba(10,54,40,0.16)]" aria-labelledby="trust-heading">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#a8e7cb]">Trust snapshot</p><h2 id="trust-heading" className="mt-2 text-2xl font-semibold">{verification ? readable(verification.stage) : "Your trust journey"}</h2></div>
                {verification && <VerificationBadge verification={verification} compact iconOnly />}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">SafeCrib recognition is calculated from verified evidence and platform activity. Your account never self-assigns a badge.</p>
              {verification?.riskBlocked && <p className="mt-5 border-l-2 border-[#f7d18a] pl-3 text-sm leading-6 text-[#f7d18a]">Your advanced badge progress is paused while your account is under review.</p>}
              {verification?.criteria?.length ? <ul className="mt-6 space-y-3 border-t border-white/10 pt-5">{verification.criteria.slice(0, 4).map((criterion) => <li key={criterion.key} className="flex items-center justify-between gap-3 text-sm"><span className="text-white/70">{criterion.label}</span><span className={criterion.met ? "text-[#a8e7cb]" : "text-white/35"}>{criterion.met ? "Verified" : "In progress"}</span></li>)}</ul> : <p className="mt-6 border-t border-white/10 pt-5 text-sm text-white/55">Complete your profile and verified actions to build your trust record.</p>}
              {verification?.nextMilestone && <p className="mt-5 text-xs leading-5 text-white/45">Next milestone: {verification.nextMilestone}</p>}
            </section>

            {(role === "STUDENT" && studentEngagement) && <section className="border-t border-black/10 pt-5" aria-label="Private student engagement"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Private to you</p><h2 className="mt-1 text-lg font-semibold text-safecrib-black">Your engagement</h2><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-black/50">Interactions</p><p className="mt-1 text-2xl font-semibold text-safecrib-black">{studentEngagement.totalInteractions}</p></div><div><p className="text-xs text-black/50">Follows</p><p className="mt-1 text-2xl font-semibold text-safecrib-black">{studentEngagement.follows}</p></div></div></section>}
            {["AGENT", "LANDLORD"].includes(role) && providerStats && <section className="border-t border-black/10 pt-5" aria-label="Public provider engagement"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Public activity</p><h2 className="mt-1 text-lg font-semibold text-safecrib-black">Your provider reach</h2><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="text-xs text-black/50">Recs</p><p className="mt-1 text-2xl font-semibold text-safecrib-black">{providerStats.recommendationCount}</p></div><div><p className="text-xs text-black/50">Likes</p><p className="mt-1 text-2xl font-semibold text-safecrib-black">{listings.reduce((sum, listing) => sum + (listing.likeCount ?? 0), 0)}</p></div><div><p className="text-xs text-black/50">Followers</p><p className="mt-1 text-2xl font-semibold text-safecrib-black">{providerStats.followerCount}</p></div></div></section>}
          </aside>
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
