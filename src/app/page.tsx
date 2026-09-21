"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { NotificationForm } from "@/components/notifications/NotificationForm";

const problems = [
  { title: "Fake listings", text: "Not every property is what it appears to be online." },
  { title: "Duplicated homes", text: "The same room or property can be advertised multiple times across channels." },
  { title: "Unverified providers", text: "Students can struggle to know whether the person listing a home is legitimate." },
  { title: "Misleading details", text: "Photos, pricing, and location information are not always reliable." },
];

const verificationFlow = [
  "Provider",
  "Provider verification",
  "Home submitted",
  "Home verification",
  "Approved",
  "Authenticated students discover it",
];

const studentSteps = [
  { title: "Create an account", text: "Join with a simple student profile and basic verification." },
  { title: "Explore verified homes", text: "Browse accommodation with clear evidence and trust context." },
  { title: "Review provider signals", text: "Understand who is listing the property and what has been checked." },
  { title: "Book with confidence", text: "Move forward with more clarity before committing." },
];

const providerSteps = [
  { title: "Create a provider page", text: "Set up a trusted profile for your property business or entity." },
  { title: "Submit verification", text: "Provide the information needed for SafeCrib review and trust checks." },
  { title: "Upload homes", text: "List homes only after the provider profile is in good standing." },
  { title: "Await review", text: "Homes undergo verification before they become discoverable." },
];

const marketplaceCards = [
  { name: "Modern Student House", area: "Garki, Abuja", price: "₦1,850,000 / year", distance: "2.1 km from campus", status: "Verified Home", review: "Provider verified", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85" },
  { name: "North View Suites", area: "Wuse, Abuja", price: "₦2,100,000 / year", distance: "1.8 km from campus", status: "Verified Home", review: "Identity confirmed", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85" },
  { name: "Campus Corner Studio", area: "Yola, Adamawa", price: "₦1,420,000 / year", distance: "0.9 km from campus", status: "Verified Home", review: "Safety checks passed", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=85" },
];

const providerImage = "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1400&q=85";

const trustProfile = [
  { label: "Identity verified", value: "95%" },
  { label: "Provider verified", value: "88%" },
  { label: "Completed bookings", value: "24" },
  { label: "Trust events", value: "12" },
];

const safetySteps = [
  "Account",
  "Provider",
  "Home",
  "Booking",
  "Review",
];

const faqItems = [
  {
    question: "What is SafeCrib?",
    answer:
      "SafeCrib is a student accommodation trust and verification platform. It is designed to help students discover accommodation from providers whose identity and listing information are reviewed before visibility is granted.",
  },
  {
    question: "Can I browse homes without creating an account?",
    answer:
      "The public landing page explains the product, but accommodation discovery is designed to happen within an authenticated experience so trust can be established around users, providers, homes, and reviews.",
  },
  {
    question: "How are providers verified?",
    answer:
      "Providers submit the information required for SafeCrib review before they are approved to publish homes. Provider verification and home verification are separate checks.",
  },
  {
    question: "Does provider verification automatically verify a home?",
    answer:
      "No. Provider verification is one layer of trust. A home still needs to pass its own checks before it becomes discoverable to authenticated students.",
  },
  {
    question: "How does SafeCrib handle suspicious listings?",
    answer:
      "Suspicious listings can be identified, reported, and routed for review. A report is not treated as proof of misconduct without investigation and platform review.",
  },
  {
    question: "Can landlords and agents use SafeCrib?",
    answer:
      "Yes. Verified accommodation providers can create a provider page, submit required information, and then publish verified homes when the review process is complete.",
  },
];

function RouteLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPending) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    startTransition(() => router.push(href));
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={isPending}
      aria-disabled={isPending}
      className={`${className} ${isPending ? "pointer-events-none opacity-70" : ""}`}
    >
      {isPending && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span>{children}</span>
    </Link>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const accountHref = isAuthenticated ? "/dashboard" : "/signup";
  const accountCta = isAuthenticated ? "Go to dashboard" : "Get Started";

  useEffect(() => {
    setIsAuthenticated(Boolean(window.localStorage.getItem("safecrib_access_token")));

    const elements = document.querySelectorAll("[data-reveal]");

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const handleNavigate = () => setMenuOpen(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-content flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-safecrib-white">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6 lg:px-8">
          <SafeCribLogo height={20} />

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-6 text-[0.7rem] font-medium text-black/60 md:flex"
          >
            <a href="#how-it-works" className="transition-colors hover:text-safecrib-black">
              How It Works
            </a>
            <a href="#students" className="transition-colors hover:text-safecrib-black">
              For Students
            </a>
            <a href="#providers" className="transition-colors hover:text-safecrib-black">
              For Providers
            </a>
            <a href="#trust" className="transition-colors hover:text-safecrib-black">
              Trust &amp; Verification
            </a>
            <a href="#faq" className="transition-colors hover:text-safecrib-black">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            {isAuthenticated ? (
              <RouteLink
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-3 py-2 text-[0.72rem] font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47] sm:px-4"
              >
                Dashboard
              </RouteLink>
            ) : (
              <>
                <RouteLink href="/login" className="inline-flex items-center gap-2 text-[0.72rem] font-medium text-black/60 transition-colors hover:text-safecrib-black">
                  Login
                </RouteLink>
                <RouteLink
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-3 py-2 text-[0.72rem] font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47] sm:px-4"
                >
                  Get Started
                </RouteLink>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-black/10 bg-safecrib-white text-safecrib-black md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">Toggle menu</span>
            <span className="flex flex-col gap-1.5">
              <span className={`block h-0.5 w-4 rounded-full bg-current transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`block h-0.5 w-4 rounded-full bg-current transition-opacity ${menuOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`block h-0.5 w-4 rounded-full bg-current transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-navigation" className="border-t border-black/10 bg-safecrib-white md:hidden">
            <nav aria-label="Mobile navigation" className="mx-auto flex max-w-content flex-col gap-1 px-4 py-4 sm:px-6">
              <a href="#how-it-works" onClick={handleNavigate} className="rounded-[4px] px-2 py-3 text-base font-medium text-safecrib-black transition-colors hover:bg-black/[0.02]">
                How It Works
              </a>
              <a href="#students" onClick={handleNavigate} className="rounded-[4px] px-2 py-3 text-base font-medium text-safecrib-black transition-colors hover:bg-black/[0.02]">
                For Students
              </a>
              <a href="#providers" onClick={handleNavigate} className="rounded-[4px] px-2 py-3 text-base font-medium text-safecrib-black transition-colors hover:bg-black/[0.02]">
                For Providers
              </a>
              <a href="#trust" onClick={handleNavigate} className="rounded-[4px] px-2 py-3 text-base font-medium text-safecrib-black transition-colors hover:bg-black/[0.02]">
                Trust &amp; Verification
              </a>
              <a href="#faq" onClick={handleNavigate} className="rounded-[4px] px-2 py-3 text-base font-medium text-safecrib-black transition-colors hover:bg-black/[0.02]">
                FAQ
              </a>

              <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                {isAuthenticated ? (
                  <RouteLink href="/dashboard" className="flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-4 py-3 text-sm font-medium text-safecrib-white shadow-[0_10px_18px_rgba(12,115,85,0.15)]">
                    Dashboard
                  </RouteLink>
                ) : (
                  <>
                    <RouteLink href="/login" className="flex items-center justify-center gap-2 rounded-[4px] border border-black/15 bg-safecrib-white px-4 py-3 text-sm font-medium text-safecrib-black">
                      Login
                    </RouteLink>
                    <RouteLink href="/signup" className="flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-4 py-3 text-sm font-medium text-safecrib-white shadow-[0_10px_18px_rgba(12,115,85,0.15)]">
                      Get Started
                    </RouteLink>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center">
        <section className="scroll-mt-28 pt-6 sm:pt-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pt-14">
          <div data-reveal className="reveal-section">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-safecrib-green">
              Student accommodation, built on trust
            </p>

            <h1 className="mt-3 max-w-md font-display text-[2.2rem] leading-[0.96] text-safecrib-black sm:text-[2.9rem] lg:text-[4rem]">
              Find a place to live. Know who you&apos;re dealing with.
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-black/65 sm:text-base">
              SafeCrib helps students discover verified accommodation and gives trusted landlords and agents a clearer way to publish homes with confidence.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:max-w-md sm:flex-row">
              <RouteLink
                href={accountHref}
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-5 py-3 text-sm font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47]"
              >
                {accountCta}
              </RouteLink>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-[4px] border border-black/15 bg-safecrib-white px-5 py-3 text-sm font-medium text-safecrib-black transition-colors hover:border-black/25 hover:bg-black/[0.02]"
              >
                How SafeCrib Works
              </a>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[0.68rem] text-black/60">
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1.5">Verified homes</span>
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1.5">Clear trust checks</span>
              <span className="rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1.5">Student-first</span>
            </div>
          </div>

          <div data-reveal className="reveal-section mt-8 lg:mt-0">
            <div className="safecrib-ambient-card rounded-[10px] border border-black/10 bg-safecrib-white p-4 shadow-[0_10px_24px_rgba(11,12,14,0.03)] sm:p-5">
              <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                <div>
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">
                    Property preview
                  </p>
                  <h2 className="mt-2 font-display text-[1.7rem] leading-none text-safecrib-black">
                    North Hall
                  </h2>
                </div>

                <span className="inline-flex items-center rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-safecrib-green">
                  Verified
                </span>
              </div>

              <div className="relative mt-4 h-52 overflow-hidden rounded-[6px] border border-black/10 bg-[#EDF3F0]">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85"
                  alt="Verified home exterior"
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-black/35 px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                  Verified home
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-sm text-black/70">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span>Landlord identity</span>
                  <span className="font-medium text-safecrib-green">Confirmed</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span>Safety checks</span>
                  <span className="font-medium text-safecrib-green">Passed</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Documents</span>
                  <span className="font-medium text-black/60">Shared</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="pt-12 sm:pt-14">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              The problem
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.7rem]">
              Finding accommodation shouldn&apos;t mean gambling on trust.
            </h2>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((item, index) => (
              <article
                key={item.title}
                data-reveal
                className="reveal-section rounded-[8px] border border-black/10 bg-black/[0.01] p-4"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-safecrib-white text-base font-medium text-safecrib-green">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-medium text-safecrib-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/65">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-12 sm:pt-16">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              SafeCrib&apos;s answer
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              We verify before we show.
            </h2>
          </div>

          <div className="mt-6 overflow-hidden rounded-[10px] border border-black/10 bg-[#F8F9F7] p-4 sm:p-6">
            <div className="safecrib-trust-flow grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              {verificationFlow.map((step, index) => (
                <div key={step} data-reveal className="reveal-section flex items-center justify-center">
                  <div
                    className={`safecrib-trust-node flex h-20 w-full items-center justify-center rounded-[8px] border px-3 text-center text-[0.7rem] font-medium uppercase tracking-[0.12em] ${
                      index === verificationFlow.length - 1
                        ? "border-safecrib-green bg-[#EAF7F1] text-safecrib-green"
                        : "border-black/10 bg-safecrib-white text-black/70"
                    }`}
                  >
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 pt-12 sm:pt-16">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              How it works
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              A clearer path for students and providers.
            </h2>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div data-reveal className="reveal-section rounded-[10px] border border-black/10 bg-safecrib-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[1.8rem] text-safecrib-black">For students</h3>
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-safecrib-green">
                  Discover safely
                </span>
              </div>

              <div className="space-y-3">
                {studentSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-3 rounded-[8px] border border-black/10 bg-black/[0.01] p-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF7F1] text-[0.7rem] font-medium text-safecrib-green">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-safecrib-black">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-black/65">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="reveal-section rounded-[10px] border border-black/10 bg-[#F8F9F7] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-[1.8rem] text-safecrib-black">For providers</h3>
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-safecrib-green">
                  Publish responsibly
                </span>
              </div>

              <div className="space-y-3">
                {providerSteps.map((step, index) => (
                  <div key={step.title} className="flex gap-3 rounded-[8px] border border-black/10 bg-safecrib-white p-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF7F1] text-[0.7rem] font-medium text-safecrib-green">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-safecrib-black">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-black/65">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pt-12 sm:pt-16">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              Marketplace preview
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              See the difference before you book.
            </h2>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {marketplaceCards.map((listing, index) => (
              <article
                key={listing.name}
                data-reveal
                className="reveal-section rounded-[10px] border border-black/10 bg-safecrib-white p-3 shadow-[0_8px_20px_rgba(11,12,14,0.02)]"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="relative h-36 overflow-hidden rounded-[8px] border border-black/10 bg-[#EDF3F0] p-4">
                  <Image
                    src={listing.image}
                    alt={`${listing.name} accommodation preview`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="rounded-full border border-black/10 bg-safecrib-white/80 px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-safecrib-green">
                    {listing.status}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-black/50">{listing.area}</p>
                      <h3 className="mt-1 font-display text-[1.5rem] text-safecrib-black">{listing.name}</h3>
                    </div>
                    <span className="rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2 py-1 text-[0.56rem] font-medium uppercase tracking-[0.12em] text-safecrib-green">
                      Verified
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-black/70">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <span>Price</span>
                      <span className="font-medium text-safecrib-black">{listing.price}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <span>Distance</span>
                      <span className="font-medium text-safecrib-black">{listing.distance}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Review</span>
                      <span className="font-medium text-safecrib-green">{listing.review}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="trust-profile" className="scroll-mt-28 pt-12 sm:pt-16">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div data-reveal className="reveal-section">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
                Trust profile
              </p>
              <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
                Trust should be explainable.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-black/65">
                SafeCrib builds trust from verifiable platform activity — not just claims. A provider profile is more useful when the underlying evidence is clear.
              </p>
            </div>

            <div data-reveal className="reveal-section rounded-[12px] border border-black/10 bg-[#F8F9F7] p-5 shadow-[0_10px_24px_rgba(11,12,14,0.02)]">
              <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                <div>
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-black/45">Provider profile</p>
                  <h3 className="mt-2 font-display text-[1.9rem] text-safecrib-black">Aisha Homes</h3>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2 py-1 text-[0.6rem] font-medium uppercase tracking-[0.12em] text-safecrib-green">
                  Verified
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[0.62rem] font-medium uppercase tracking-[0.12em] text-safecrib-green">
                <span className="rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2.5 py-1.5">Identity verified</span>
                <span className="rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2.5 py-1.5">Provider verified</span>
                <span className="rounded-full border border-[#A9E0CD] bg-[#EAF7F1] px-2.5 py-1.5">Review ready</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {trustProfile.map((item) => (
                  <div key={item.label} className="rounded-[8px] border border-black/10 bg-safecrib-white p-3 shadow-[0_2px_10px_rgba(11,12,14,0.02)]">
                    <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-black/45">{item.label}</p>
                    <p className="mt-2 font-display text-[1.9rem] leading-none text-safecrib-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="providers" className="scroll-mt-28 pt-12 sm:pt-16">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div data-reveal className="reveal-section">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
                For providers
              </p>
              <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
                A trusted place to publish your homes.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-black/65">
                SafeCrib gives verified accommodation providers a controlled publishing workflow designed to reduce misleading listings and improve trust.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <RouteLink
                  href={accountHref}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-5 py-3 text-sm font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47]"
                >
                  {isAuthenticated ? "Open dashboard" : "Become a Provider"}
                </RouteLink>
                <a
                  href="#trust"
                  className="inline-flex items-center justify-center rounded-[4px] border border-black/15 bg-safecrib-white px-5 py-3 text-sm font-medium text-safecrib-black transition-colors hover:border-black/25 hover:bg-black/[0.02]"
                >
                  Learn How Verification Works
                </a>
              </div>
            </div>

            <div data-reveal className="reveal-section overflow-hidden rounded-[10px] border border-black/10 bg-[#F8F9F7] p-5">
              <div className="relative mb-5 h-40 overflow-hidden rounded-[8px] border border-black/10">
                <Image
                  src={providerImage}
                  alt="Bright accommodation managed by a provider"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 text-xs font-medium text-white">Provider portfolio</span>
              </div>
              <div className="space-y-3">
                {providerSteps.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3 rounded-[8px] border border-black/10 bg-safecrib-white p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F1] text-[0.7rem] font-medium text-safecrib-green">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-safecrib-black">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-black/65">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="students" className="scroll-mt-28 pt-12 sm:pt-16">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div data-reveal className="reveal-section rounded-[10px] border border-black/10 bg-[#F8F9F7] p-5">
              <div className="space-y-3">
                {studentSteps.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3 rounded-[8px] border border-black/10 bg-safecrib-white p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F1] text-[0.7rem] font-medium text-safecrib-green">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-safecrib-black">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-black/65">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="reveal-section">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
                For students
              </p>
              <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
                Accommodation discovery without the guesswork.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-black/65">
                SafeCrib is built to help students compare homes with clearer signals, better context, and greater confidence before they commit.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <RouteLink
                  href={accountHref}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-5 py-3 text-sm font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47]"
                >
                  {isAuthenticated ? "Explore dashboard" : "Find Your Next Home"}
                </RouteLink>
                <a
                  href="#faq"
                  className="inline-flex items-center justify-center rounded-[4px] border border-black/15 bg-safecrib-white px-5 py-3 text-sm font-medium text-safecrib-black transition-colors hover:border-black/25 hover:bg-black/[0.02]"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-12 sm:pt-16">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              Safety and verification
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              Every layer has a checkpoint.
            </h2>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {safetySteps.map((step, index) => (
              <div key={step} data-reveal className="reveal-section flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-safecrib-white text-sm font-medium text-safecrib-black shadow-[0_4px_14px_rgba(11,12,14,0.04)]">
                    {index + 1}
                  </div>
                  <span className="text-[0.64rem] font-medium uppercase tracking-[0.16em] text-black/50">{step}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[10px] border border-black/10 bg-[#F8F9F7] p-5 text-sm leading-7 text-black/65">
            SafeCrib is designed to create an auditable trust trail across account verification, provider checks, home review, booking protection, and post-booking review. This supports a safer accommodation experience without depending on vague claims or empty trust messaging.
          </div>
        </section>

        <section className="pt-12 sm:pt-16">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div data-reveal className="reveal-section">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
                Authentication before discovery
              </p>
              <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
                Discovery happens in context.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-black/65">
                SafeCrib is designed as an authenticated marketplace experience so the platform can establish a trusted environment around users, providers, homes, and reviews.
              </p>
            </div>

            <div data-reveal className="reveal-section rounded-[12px] border border-black/10 bg-safecrib-white p-5 shadow-[0_12px_28px_rgba(11,12,14,0.03)]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[8px] border border-black/10 bg-[#F8F9F7] p-3">
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">Public</p>
                  <p className="mt-3 text-sm leading-6 text-black/70">Landing page</p>
                </div>
                <div className="rounded-[8px] border border-black/10 bg-[#EAF7F1] p-3">
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-safecrib-green">Sign up</p>
                  <p className="mt-3 text-sm leading-6 text-safecrib-black">Authenticate</p>
                </div>
                <div className="rounded-[8px] border border-black/10 bg-[#F8F9F7] p-3">
                  <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">Dashboard</p>
                  <p className="mt-3 text-sm leading-6 text-black/70">Discover + book</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pt-12 sm:pt-16">
          <div data-reveal className="reveal-section rounded-[10px] border border-black/10 bg-[#F8F9F7] p-5 sm:p-6">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              Future capability
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              Closer isn&apos;t always better.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-black/65">
              SafeCrib is designed to support smarter accommodation discovery by helping students understand realistic commute time to campus, faculty, and daily routines — not just straight-line distance.
            </p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 pt-12 sm:pt-16">
          <div data-reveal className="reveal-section max-w-xl">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-none text-safecrib-black sm:text-[2.8rem]">
              Questions students and providers ask before they trust a platform.
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            {faqItems.map((faqItem, index) => (
              <details
                key={faqItem.question}
                open={index === 0}
                className="safecrib-accordion reveal-section rounded-[8px] border border-black/10 bg-safecrib-white p-4"
                data-reveal
              >
                <summary className="cursor-pointer list-none text-base font-medium text-safecrib-black">
                  {faqItem.question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-black/65">{faqItem.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="final-cta" className="scroll-mt-28 pt-12 sm:pt-16">
          <div data-reveal className="reveal-section rounded-[12px] border border-black/10 bg-[#F6F8F7] p-5 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-safecrib-green">
                  The next step
                </p>
                <h2 className="mt-3 font-display text-[2.15rem] leading-none text-safecrib-black sm:text-[2.7rem]">
                  Accommodation should feel like a decision, not a gamble.
                </h2>
                <p className="mt-3 text-base leading-7 text-black/65">
                  SafeCrib is building a more trusted way for students to discover accommodation and for verified providers to publish homes with clarity.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <RouteLink
                  href={accountHref}
                  className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-safecrib-green px-5 py-3 text-sm font-medium text-safecrib-white transition-colors hover:bg-[#0a5f47]"
                >
                  {accountCta}
                </RouteLink>
                <NotificationForm />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-12 border-t border-black/10 pt-8">
        <div className="mx-auto max-w-content px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SafeCribLogo height={18} />
              <p className="mt-3 max-w-sm text-sm leading-6 text-black/60">
                SafeCrib is building a safer, clearer way for students and verified providers to navigate accommodation.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-black/65 sm:grid-cols-3">
              <div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">Product</p>
                <ul className="mt-2 space-y-2">
                  <li><a href="#how-it-works" className="hover:text-safecrib-black">How It Works</a></li>
                  <li><a href="#trust" className="hover:text-safecrib-black">Trust &amp; Verification</a></li>
                </ul>
              </div>
              <div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">For users</p>
                <ul className="mt-2 space-y-2">
                  <li><a href="#students" className="hover:text-safecrib-black">For Students</a></li>
                  <li><a href="#providers" className="hover:text-safecrib-black">For Providers</a></li>
                </ul>
              </div>
              <div>
                <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-black/45">Support</p>
                <ul className="mt-2 space-y-2">
                  <li><a href="#faq" className="hover:text-safecrib-black">FAQ</a></li>
                  <li><a href="#final-cta" className="hover:text-safecrib-black">Get Started</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-black/10 pt-4 text-[0.68rem] uppercase tracking-[0.12em] text-black/45">
            © 2026 SafeCrib
          </div>
        </div>
      </footer>
    </main>
  );
}
