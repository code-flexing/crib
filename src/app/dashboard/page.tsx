"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RestrictedActionModal } from "@/components/dashboard/RestrictedActionModal";
import { Button } from "@/components/ui/Button";
import { apiFetch, cachedApiFetch, cachedCurrentUser, displayName, getCachedCurrentUser, isUnauthorizedError, normalizeAccountStatus, normalizePageStatus, resolveMediaUrl, type AccountStatus, type PageStatus } from "@/lib/api";

type Listing = { id: string; title?: string; description?: string; price?: number; address?: string; campus?: string; photos?: string[]; images?: string[] };
type Profile = { displayName?: unknown; email?: string; role?: string; profilePicture?: string; studentProfileStatus?: unknown };
type StudentProfile = { profilePicture?: string } | null;
type ProviderPage = { id?: string; status?: string; rejectionReason?: string; reason?: string } | null;

function accountMessage(status: AccountStatus, action: string) {
  if (status === "pending" || status === "not_submitted") return `Your account is still under review. You'll be able to ${action} once it's approved.`;
  if (status === "rejected") return "Your account submission wasn't approved. Please update and resubmit your profile.";
  return null;
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
    if (cachedProfile) setProfile(cachedProfile);

    void Promise.all([
      cachedCurrentUser<Profile>(),
      cachedApiFetch<StudentProfile>("/api/v1/student-profiles/me").catch(() => null),
      cachedApiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      cachedApiFetch<ProviderPage>("/api/v1/provider-pages/me").catch(() => null),
      cachedApiFetch<Listing[]>("/api/v1/listings").catch(() => []),
      cachedApiFetch<Listing[]>("/api/v1/listings/bookmarks").catch(() => []),
      cachedApiFetch<unknown>("/api/v1/support/conversations").catch(() => []),
    ]).then(async ([user, studentProfile, studentStatus, providerPage, homes, bookmarks, conversations]) => {
      setProfile(user);
      setProfileImage(await resolveMediaUrl(user.profilePicture ?? studentProfile?.profilePicture));
      const profileStatus = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
        ? user.studentProfileStatus.status
        : studentStatus && typeof studentStatus === "object" && "status" in studentStatus ? studentStatus.status : studentStatus;
      setAccountStatus(normalizeAccountStatus(profileStatus));
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
  const signOut = () => {
    localStorage.removeItem("safecrib_access_token");
    localStorage.removeItem("safecrib_refresh_token");
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
      <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} canManagePage={profile?.role === "AGENT" || profile?.role === "LANDLORD"} displayName={displayName(profile?.displayName)} profileImage={profileImage} />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-safecrib-green">Home</p>
            <h1 className="mt-2 font-display text-3xl italic text-safecrib-black sm:text-4xl">{displayName(profile?.displayName) || "Welcome"}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">Browse available accommodation and inspect the details before you decide what to do next.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/support" aria-label={`Open support${openSupportCount ? `, ${openSupportCount} open` : ""}`} className="inline-flex items-center gap-2 text-safecrib-green hover:underline"><span aria-hidden="true">?</span><span>Support</span>{openSupportCount > 0 && <span className="rounded-full bg-safecrib-green px-2 py-0.5 text-xs text-white">{openSupportCount}</span>}</Link>
            {accountStatus === "not_submitted" && <Link href="/profile/complete" className="text-safecrib-green hover:underline">Complete student profile</Link>}
            {accountStatus === "rejected" && <Link href="/profile/complete" className="text-safecrib-green hover:underline">Update rejected profile</Link>}
            {pageStatus !== "none" && <Link href="/page" className="text-safecrib-green hover:underline">View my Page</Link>}
          </div>
        </div>
        {listings.length === 0 && <p className="mt-8 rounded-[4px] border border-black/10 bg-white p-6 text-sm text-black/60">No listings are available yet.</p>}
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
                  <Button type="button" variant="secondary" className="px-4 py-2.5 text-sm" onClick={() => void toggleBookmark(listing.id)}>{bookmarkedIds.includes(listing.id) ? "Saved" : "Save"}</Button>
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
