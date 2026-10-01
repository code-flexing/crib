"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyListingsIllustration } from "@/components/branding/EmptyListingsIllustration";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RestrictedActionModal } from "@/components/dashboard/RestrictedActionModal";
import { Button } from "@/components/ui/Button";
import { apiFetch, cachedApiFetch, displayName, getAuthenticatedDisplayName, getCachedCurrentUser, isUnauthorizedError, normalizeAccountStatus, normalizePageStatus, primeCurrentUserCache, resolveMediaUrl, unwrapData, type AccountStatus, type PageStatus } from "@/lib/api";

type Listing = { id: string; title?: string; description?: string; price?: number; address?: string; campus?: string; photos?: string[]; images?: string[] };
type Profile = { displayName?: unknown; email?: string; role?: string; profilePicture?: string; studentProfileStatus?: unknown; studentProfile?: { profilePicture?: string } };
type StudentProfile = { profilePicture?: string } | null;
type ProviderPage = { id?: string; status?: string; profilePicture?: string; rejectionReason?: string; reason?: string } | null;

function accountMessage(status: AccountStatus, action: string) {
  if (status === "pending" || status === "not_submitted") return `Your account is still under review. You'll be able to ${action} once it's approved.`;
  if (status === "rejected") return "Your account submission wasn't approved. Please update and resubmit your profile.";
  return null;
}

function emailNameFallback(email?: string) {
  const username = email?.split("@")[0]?.split("+")[0]?.replace(/[._-]+/g, " ").trim();
  return username ? username.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()) : "";
}

function resolveAccountName(profile: Profile | null) {
  return displayName(profile) || getAuthenticatedDisplayName() || emailNameFallback(profile?.email);
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("not_submitted");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) {
      router.replace("/login");
      return;
    }

    const cachedProfile = getCachedCurrentUser<Profile>();
    if (cachedProfile) setProfile({ ...cachedProfile, displayName: resolveAccountName(cachedProfile) });
    else {
      const tokenName = getAuthenticatedDisplayName();
      if (tokenName) setProfile({ displayName: tokenName });
    }

    void apiFetch<unknown>("/api/v1/auth/me", { method: "POST" }).then(async (identityResponse) => {
      const identity = unwrapData<Profile>(identityResponse);
      const identityRole = String(identity.role ?? "").toUpperCase();
      let user = identity;
      if (identityRole !== "UNVERIFIED") {
        try {
          const profileResponse = unwrapData<Profile>(await apiFetch<unknown>("/api/v1/users/me"));
          user = { ...identity, ...profileResponse };
        } catch {
          user = identity;
        }
      }
      if (!displayName(user)) user = { ...user, displayName: resolveAccountName(user) };
      primeCurrentUserCache(user);
      const role = String(user.role ?? "").toUpperCase();
      const studentMode = role === "STUDENT";
      const [studentProfile, studentStatus, providerPage, homes, bookmarks, conversations] = await Promise.all([
        studentMode ? cachedApiFetch<StudentProfile>("/api/v1/student-profiles/me").catch(() => null) : Promise.resolve(null),
        studentMode ? cachedApiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null) : Promise.resolve(null),
        cachedApiFetch<ProviderPage>("/api/v1/provider-pages/me").catch(() => null),
        cachedApiFetch<Listing[]>("/api/v1/listings").catch(() => []),
        role === "STUDENT" ? cachedApiFetch<Listing[]>("/api/v1/listings/bookmarks").catch(() => []) : Promise.resolve([]),
        cachedApiFetch<unknown>("/api/v1/support/conversations").catch(() => []),
      ]);
      return { user, studentProfile, studentStatus, providerPage, homes, bookmarks, conversations };
    }).then(async ({ user, studentProfile, studentStatus, providerPage, homes, bookmarks, conversations }) => {
      setProfile({ ...user, displayName: displayName(user) || getAuthenticatedDisplayName() });
      const role = String(user.role ?? "").toUpperCase();
      const profileStatus = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
        ? user.studentProfileStatus.status
        : studentStatus && typeof studentStatus === "object" && "status" in studentStatus ? studentStatus.status : studentStatus;
      const studentVerified = role === "STUDENT" && normalizeAccountStatus(profileStatus) === "approved";
      const providerVerified = ["AGENT", "LANDLORD"].includes(role) && String(providerPage?.status ?? "").toUpperCase() === "VERIFIED";
      const studentProfileData = unwrapData<StudentProfile>(studentProfile);
      const pictureReference = user.profilePicture ?? user.studentProfile?.profilePicture ?? studentProfileData?.profilePicture ?? providerPage?.profilePicture;
      setProfileImage(studentVerified || providerVerified ? pictureReference ? await resolveMediaUrl(pictureReference) : null : null);
      setAccountStatus(providerVerified ? "approved" : ["AGENT", "LANDLORD"].includes(role) ? "pending" : normalizeAccountStatus(profileStatus));
      setPageStatus(normalizePageStatus(providerPage?.status));
      setListings(Array.isArray(homes) ? homes : []);
      setBookmarkedIds(Array.isArray(bookmarks) ? bookmarks.map((listing) => listing.id) : []);
      const conversationList = Array.isArray(conversations) ? conversations : [];
      setOpenSupportCount(conversationList.filter((conversation) => typeof conversation === "object" && conversation !== null && "status" in conversation && String(conversation.status).toUpperCase() === "OPEN").length);
    }).catch((loadError: unknown) => {
      if (isUnauthorizedError(loadError)) {
        localStorage.removeItem("safecrib_access_token");
        localStorage.removeItem("safecrib_refresh_token");
        router.replace("/login?reason=session-expired");
        return;
      }
      setProfile(null);
      setAccountStatus("not_submitted");
      setPageStatus("none");
      setListings([]);
      setBookmarkedIds([]);
    });
  }, [router]);

  const toggleBookmark = async (listingId: string) => {
    const isSaved = bookmarkedIds.includes(listingId);
    const message = accountMessage(accountStatus, isSaved ? "remove this saved listing" : "save this listing");
    if (message) {
      setActionMessage(message);
      return;
    }
    try {
      await apiFetch(`/api/v1/listings/${listingId}/bookmark`, { method: isSaved ? "DELETE" : "POST" });
      setBookmarkedIds((current) => isSaved ? current.filter((id) => id !== listingId) : [...current, listingId]);
    } catch {
      setActionMessage("We could not update your saved listings. Please try again.");
    }
  };

  const openPage = () => router.push(pageStatus === "none" ? "/page/new" : "/page");
  const accountName = resolveAccountName(profile);
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} pageStatus={pageStatus} canManagePage supportCount={openSupportCount} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            {profileImage ? <Image src={profileImage} alt={`${accountName || "Your"} profile photo`} width={64} height={64} unoptimized className="h-14 w-14 shrink-0 rounded-full border border-black/10 object-cover" /> : <span aria-label="Default profile photo" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-safecrib-green/20 bg-safecrib-green/10 text-safecrib-green"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.6"><circle cx="12" cy="8" r="3.5" /><path d="M4.8 20c.9-3.3 3.3-5 7.2-5s6.3 1.7 7.2 5" strokeLinecap="round" /></svg></span>}
            <div>
              {accountName && <h1 className="font-display text-3xl font-bold text-safecrib-green sm:text-4xl">{accountName}</h1>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            {["UNVERIFIED", "STUDENT"].includes(String(profile?.role ?? "").toUpperCase()) && accountStatus === "not_submitted" && <Link href="/profile/complete" className="text-safecrib-green hover:underline">Complete student profile</Link>}
            {["UNVERIFIED", "STUDENT"].includes(String(profile?.role ?? "").toUpperCase()) && accountStatus === "rejected" && <Link href="/profile/complete" className="text-safecrib-green hover:underline">Update rejected profile</Link>}
            <Link href={pageStatus === "none" ? "/page/new" : "/page"} className="text-safecrib-green hover:underline">{pageStatus === "none" ? "Create a provider Page" : "View my Page"}</Link>
          </div>
        </div>
        {listings.length === 0 && <div className="mt-8 flex min-h-64 items-center justify-center rounded-xl border border-black/10 bg-white px-5 py-8 sm:min-h-72" aria-label="No listings are available yet"><EmptyListingsIllustration /></div>}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const image = listing.photos?.[0] ?? listing.images?.[0];
            return <article key={listing.id} className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(11,12,14,0.05)]">
              {image && <Image src={image} alt={listing.title ?? "Listing"} width={800} height={480} className="h-44 w-full object-cover" />}
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Verified home</p>
                <h2 className="mt-2 text-xl font-medium text-safecrib-black">{listing.title ?? "Untitled home"}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/60">{listing.description ?? "View this home for more details."}</p>
                <p className="mt-4 font-medium text-safecrib-black">{typeof listing.price === "number" ? `₦${listing.price.toLocaleString()}` : "Price available in details"}</p>
                <p className="mt-1 text-xs text-black/50">{listing.address ?? listing.campus ?? "Location available in details"}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/dashboard/listings/${listing.id}`} className="rounded-[3px] bg-safecrib-green px-4 py-2.5 text-sm font-medium text-safecrib-white hover:bg-[#0a5f47]">View details</Link>
                  {["UNVERIFIED", "STUDENT"].includes(String(profile?.role ?? "").toUpperCase()) && <Button type="button" variant="secondary" className="px-4 py-2.5 text-sm" onClick={() => void toggleBookmark(listing.id)}>{bookmarkedIds.includes(listing.id) ? "Saved" : "Save"}</Button>}
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>
      <RestrictedActionModal message={actionMessage} onClose={() => setActionMessage(null)} />
    </main>
  );
}
