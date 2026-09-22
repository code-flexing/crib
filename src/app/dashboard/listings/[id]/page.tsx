"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { RestrictedActionModal } from "@/components/dashboard/RestrictedActionModal";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiFetch, normalizeAccountStatus, normalizePageStatus, type AccountStatus, type PageStatus } from "@/lib/api";

type Listing = { id: string; title?: string; description?: string; price?: number; address?: string; campus?: string; lat?: number; lng?: number; photos?: string[]; images?: string[]; providerId?: string; providerPageId?: string; provider?: { id?: string; displayName?: string; email?: string } };
type Profile = { studentProfileStatus?: unknown };
type ProviderPage = { status?: string } | null;

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("not_submitted");
  const [pageStatus, setPageStatus] = useState<PageStatus>("none");
  const [message, setMessage] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [modal, setModal] = useState<"contact" | "booking" | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("safecrib_access_token")) { router.replace("/login"); return; }
    void Promise.all([
      apiFetch<Listing>(`/api/v1/listings/${id}`),
      apiFetch<Profile>("/api/v1/users/me"),
      apiFetch<unknown>("/api/v1/student-profiles/status").catch(() => null),
      apiFetch<ProviderPage>("/api/v1/provider-pages/me").catch(() => null),
      apiFetch<Listing[]>("/api/v1/listings/bookmarks").catch(() => []),
    ]).then(([home, user, status, page, bookmarks]) => {
      setListing(home);
      const rawStatus = typeof user.studentProfileStatus === "object" && user.studentProfileStatus !== null && "status" in user.studentProfileStatus
        ? user.studentProfileStatus.status : status && typeof status === "object" && "status" in status ? status.status : status;
      setAccountStatus(normalizeAccountStatus(rawStatus));
      setPageStatus(normalizePageStatus(page?.status));
      setBookmarked(Array.isArray(bookmarks) && bookmarks.some((saved) => saved.id === home.id));
    });
  }, [id, router]);

  const gate = (action: string) => {
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
  const openPage = () => router.push(pageStatus === "none" ? "/page/new" : "/page");
  const signOut = () => { localStorage.removeItem("safecrib_access_token"); localStorage.removeItem("safecrib_refresh_token"); router.replace("/login"); };
  const image = listing?.photos?.[0] ?? listing?.images?.[0];

  return <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f5f7f2_100%)] pb-24 md:pb-8">
    <DashboardNav onCreatePage={openPage} onSignOut={signOut} pageStatus={pageStatus} canManagePage={false} />
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <Link href="/dashboard" className="text-sm font-medium text-safecrib-green hover:underline">Back to homes</Link>
      {listing ? <article className="mt-6 overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(11,12,14,0.05)]">
        {image && <Image src={image} alt={listing.title ?? "Listing"} width={1200} height={700} className="max-h-[28rem] w-full object-cover" />}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">Verified home</p>
          <h1 className="mt-2 text-3xl font-medium text-safecrib-black">{listing.title ?? "Untitled home"}</h1>
          <p className="mt-4 text-2xl font-medium text-safecrib-black">{typeof listing.price === "number" ? `₦${listing.price.toLocaleString()}` : "Price available on request"}</p>
          <p className="mt-2 text-sm text-black/55">{listing.address ?? listing.campus ?? "Location available on request"}</p>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-black/65">{listing.description ?? "No description provided."}</p>
          <p className="mt-6 text-sm text-black/60">Provider: {listing.provider?.displayName ?? "Verified provider"}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" onClick={() => gate("book this home")}>Book this home</Button>
            <Button type="button" variant="secondary" onClick={() => void toggleBookmark()}>{bookmarked ? "Saved" : "Save"}</Button>
            <Button type="button" variant="secondary" onClick={() => gate("contact the provider")}>Contact provider</Button>
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
  </main>;
}