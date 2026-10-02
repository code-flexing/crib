"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { BackHomeLink } from "@/components/ui/BackHomeLink";
import { RestrictedActionModal } from "@/components/dashboard/RestrictedActionModal";
import { normalizeVerificationStage, VerificationBadge, type VerificationStageResult } from "@/components/verification/VerificationBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiFetch, cachedApiFetch, normalizeAccountStatus, normalizePageStatus, resolveMediaUrl, unwrapData, type AccountStatus, type PageStatus } from "@/lib/api";

type Listing = { id: string; ownerId?: string; title?: string; description?: string; price?: number; discountAmount?: number; discountedPrice?: number; address?: string; campus?: string; lat?: number; lng?: number; locationReference?: string; photos?: (string | { url?: string })[]; images?: string[]; video?: { mediaId?: string; url?: string } | null; providerId?: string; providerPageId?: string; provider?: { id?: string; displayName?: string; email?: string } };
type Profile = { role?: string; studentProfileStatus?: unknown };
type ProviderPage = { status?: string } | null;
type ReportType = "FAKE_LISTING" | "MISREPRESENTED" | "DOUBLE_BOOKING" | "SCAM_AGENT" | "OTHER";

function photoUrl(photo: string | { url?: string }) {
  return typeof photo === "string" ? photo : photo.url;
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [providerVerification, setProviderVerification] = useState<VerificationStageResult | null>(null);
  const [providerBadgeUnavailable, setProviderBadgeUnavailable] = useState(false);
  const [role, setRole] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("not_submitted");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [message, setMessage] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [modal, setModal] = useState<"contact" | "booking" | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("FAKE_LISTING");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void Promise.all([
      apiFetch<Listing>(`/api/v1/listings/${id}`),
      apiFetch<Profile>("/api/v1/users/me"),
      apiFetch<ProviderPage>("/api/v1/provider-pages/me").catch(() => null),
    ]).then(async ([homeResponse, userResponse, pageResponse]) => {
      const home = unwrapData<Listing>(homeResponse);
      const user = unwrapData<Profile>(userResponse);
      const page = unwrapData<ProviderPage>(pageResponse);
      setListing(home);
      if (home.ownerId) {
        void cachedApiFetch<unknown>(`/api/v1/trust/users/${encodeURIComponent(home.ownerId)}/verification-stage`)
          .then((response) => setProviderVerification(normalizeVerificationStage(response)))
          .catch(() => {
            setProviderVerification(null);
            setProviderBadgeUnavailable(true);
          });
      }
      const accountRole = String(user.role ?? "").toUpperCase();
      const providerRole = ["AGENT", "LANDLORD"].includes(accountRole);
      setRole(accountRole);
      setPageStatus(normalizePageStatus(page?.status));
      const [studentStatus, bookmarks] = await Promise.all([
        accountRole === "STUDENT" ? apiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null) : Promise.resolve(null),
        accountRole === "STUDENT" ? apiFetch<Listing[]>("/api/v1/listings/bookmarks").catch(() => []) : Promise.resolve([]),
      ]);
      const persistedStatus = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
        ? user.studentProfileStatus.status
        : studentStatus && typeof studentStatus === "object" && "status" in studentStatus ? studentStatus.status : studentStatus;
      setAccountStatus(providerRole ? (String(page?.status ?? "").toUpperCase() === "VERIFIED" ? "approved" : "pending") : normalizeAccountStatus(persistedStatus));
      setBookmarked(Array.isArray(bookmarks) && bookmarks.some((saved) => saved.id === home.id));
      const mediaUrl = home.video?.url ?? await resolveMediaUrl(home.video?.mediaId);
      setVideoUrl(mediaUrl ?? "");
    });
  }, [id, router]);

  const gate = (action: string) => {
    if (["AGENT", "LANDLORD"].includes(role) && pageStatus === "approved") { setModal(action === "contact the provider" ? "contact" : "booking"); return; }
    if (accountStatus === "pending" || accountStatus === "not_submitted") setMessage(`Your account is still under review. You'll be able to ${action} once it's approved.`);
    else if (accountStatus === "rejected") setMessage("Your account submission wasn't approved. Please update and resubmit your profile.");
    else setModal(action === "contact the provider" ? "contact" : "booking");
  };
  const toggleBookmark = async () => {
    if (accountStatus !== "approved") { gate("save this listing"); return; }
    try {
      await apiFetch(`/api/v1/listings/${id}/bookmark`, { method: bookmarked ? "DELETE" : "POST" });
      setBookmarked((current) => !current);
    } catch { setMessage("We could not update your saved listings. Please try again."); }
  };
  const submitContact = async () => {
    const providerId = listing?.providerPageId ?? listing?.providerId ?? listing?.provider?.id;
    if (!providerId || !contactMessage.trim()) { setMessage("A provider and message are required to send an email."); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/provider-pages/${providerId}/contact`, { method: "POST", body: JSON.stringify({ message: contactMessage.trim(), listingId: id }) });
      setModal(null); setContactMessage(""); setMessage("Your email was sent to the provider.");
    } catch { setMessage("We could not send your email. Please try again."); }
    finally { setSubmitting(false); }
  };
  const submitBooking = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a valid deposit amount."); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/bookings", { method: "POST", body: JSON.stringify({ listingId: id, depositAmount: amount }) });
      setModal(null); setDepositAmount(""); setMessage("Your booking hold was created.");
    } catch { setMessage("We could not create this booking. Please try again."); }
    finally { setSubmitting(false); }
  };
  const submitReport = async () => {
    if (reportDescription.trim().length < 10 || reportDescription.trim().length > 2000) { setMessage("Describe the concern in 10 to 2,000 characters."); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/fraud/reports", { method: "POST", body: JSON.stringify({ targetListingId: id, type: reportType, description: reportDescription.trim() }) });
      setReportOpen(false);
      setReportDescription("");
      setMessage("Your report was sent for review. Submitting a report does not automatically remove this listing.");
    } catch (reportError) {
      setMessage(reportError instanceof Error ? reportError.message : "We could not send your report. Please try again.");
    } finally { setSubmitting(false); }
  };
  const openPage = () => router.push(pageStatus === "none" ? "/page/new" : "/page");
  const image = listing?.photos?.[0] ? photoUrl(listing.photos[0]) : listing?.images?.[0];
  const mapUrl = typeof listing?.lat === "number" && typeof listing.lng === "number" ? `https://www.google.com/maps?q=${encodeURIComponent(`${listing.lat},${listing.lng}`)}&output=embed` : "";

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
    <DashboardNav onCreatePage={openPage} pageStatus={pageStatus} canManagePage={false} />
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <BackHomeLink label="Back to homes" />
      {listing ? <article className="mt-6 overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(11,12,14,0.05)]">
        {image && <Image src={image} alt={listing.title ?? "Listing"} width={1200} height={700} className="max-h-[28rem] w-full object-cover" />}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Verified home</p>
          <h1 className="mt-2 text-3xl font-medium text-safecrib-black">{listing.title ?? "Untitled home"}</h1>
          <p className="mt-4 text-2xl font-medium text-safecrib-black">{typeof (listing.discountedPrice ?? listing.price) === "number" ? `₦${(listing.discountedPrice ?? listing.price)!.toLocaleString()}` : "Price available on request"}</p>
          {typeof listing.discountAmount === "number" && listing.discountAmount > 0 && <p className="mt-1 text-sm text-black/50">Base price ₦{listing.price?.toLocaleString()}</p>}
          <p className="mt-2 text-sm text-black/55">{listing.address ?? listing.campus ?? "Location available on request"}</p>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-black/65">{listing.description ?? "No description provided."}</p>
          {listing.photos && listing.photos.length > 1 && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{listing.photos.slice(1).map((photo, index) => {
            const url = photoUrl(photo);
            return url ? <Image key={`${url}-${index}`} src={url} alt={`${listing.title ?? "Home"} photo ${index + 2}`} width={500} height={360} className="aspect-[4/3] w-full object-cover" /> : null;
          })}</div>}
          {mapUrl && <section className="mt-7" aria-label="Home location"><h2 className="mb-3 text-lg font-medium">Location</h2><iframe title="Home location map" src={mapUrl} loading="lazy" className="h-64 w-full border-0" referrerPolicy="no-referrer-when-downgrade" /></section>}
          {listing.video?.mediaId && <section className="mt-7" aria-label="Home video"><h2 className="mb-3 text-lg font-medium">Home video</h2>{videoUrl ? <video src={videoUrl} controls preload="metadata" className="max-h-[28rem] w-full bg-black" /> : <p className="text-sm text-black/55">Video is not available yet. Refresh the listing to try again.</p>}</section>}
          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-black/60">
            Provider: {listing.ownerId
              ? <Link href={`/profile/${encodeURIComponent(listing.ownerId)}`} className="font-medium text-safecrib-green hover:underline">{listing.provider?.displayName ?? "Verified provider"}</Link>
              : <span>{listing.provider?.displayName ?? "Verified provider"}</span>}
            {providerVerification && <VerificationBadge verification={providerVerification} compact iconOnly />}
          </p>
          {providerBadgeUnavailable && <p className="mt-1 text-xs text-amber-800" role="status">Provider verification badge is temporarily unavailable.</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={() => gate("book this home")}>Book this home</Button>
            {!(["AGENT", "LANDLORD"].includes(role)) && <Button type="button" variant="secondary" onClick={() => void toggleBookmark()}>{bookmarked ? "Saved" : "Save"}</Button>}
            <Button type="button" variant="secondary" onClick={() => gate("contact the provider")}>Contact provider</Button>
            <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>Report listing</Button>
          </div>
        </div>
      </article> : <p className="mt-8 text-sm text-black/60">Loading listing details...</p>}
    </section>
    <RestrictedActionModal message={message} onClose={() => setMessage(null)} />
    <Modal open={modal === "contact"} onClose={() => setModal(null)} titleId="contact-provider-title">
      <h2 id="contact-provider-title" className="text-xl font-medium text-safecrib-black">Email provider</h2>
      <p className="mt-3 text-sm leading-6 text-black/60">Your message will be sent to the provider by email.</p>
      <textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} rows={5} placeholder="Write your message" className="mt-4 w-full rounded-[8px] border border-black/15 px-4 py-3 text-sm text-safecrib-black focus:border-safecrib-green focus:outline-none" />
      <Button type="button" loading={submitting} onClick={() => void submitContact()} className="mt-4">Send email</Button>
    </Modal>
    <Modal open={modal === "booking"} onClose={() => setModal(null)} titleId="booking-title">
      <h2 id="booking-title" className="text-xl font-medium text-safecrib-black">Book this home</h2>
      <p className="mt-3 text-sm leading-6 text-black/60">Enter the deposit amount in the backend&apos;s minor currency unit.</p>
      <input inputMode="numeric" type="number" min="1" value={depositAmount} onChange={(event) => setDepositAmount(event.target.value)} placeholder="Deposit amount" className="mt-4 w-full rounded-[8px] border border-black/15 px-4 py-3 text-sm text-safecrib-black focus:border-safecrib-green focus:outline-none" />
      <Button type="button" loading={submitting} onClick={() => void submitBooking()} className="mt-4">Create booking hold</Button>
    </Modal>
    <Modal open={reportOpen} onClose={() => setReportOpen(false)} titleId="report-listing-title">
      <h2 id="report-listing-title" className="text-xl font-medium text-safecrib-black">Report this listing</h2>
      <p className="mt-3 text-sm leading-6 text-black/60">Reports are reviewed by SafeCrib. Sending one does not immediately hide the home.</p>
      <label className="mt-4 block text-sm font-medium">Concern<select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="mt-2 w-full border border-black/15 bg-white px-4 py-3"><option value="FAKE_LISTING">Fake listing</option><option value="MISREPRESENTED">Misrepresented</option><option value="DOUBLE_BOOKING">Double booking</option><option value="SCAM_AGENT">Scam agent</option><option value="OTHER">Other</option></select></label>
      <label className="mt-4 block text-sm font-medium">Details<textarea minLength={10} maxLength={2000} rows={5} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} className="mt-2 w-full border border-black/15 px-4 py-3 text-sm" /></label>
      <p className="mt-1 text-right text-xs text-black/45">{reportDescription.length}/2,000</p>
      <Button type="button" loading={submitting} onClick={() => void submitReport()} className="mt-4">Send report</Button>
    </Modal>
  </main>;
}