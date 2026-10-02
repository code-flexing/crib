import Link from "next/link";

type ReviewPendingStateProps = {
  subject: "student profile" | "provider Page";
};

export function ReviewPendingState({ subject }: ReviewPendingStateProps) {
  const isProviderPage = subject === "provider Page";

  return (
    <section
      aria-labelledby="review-pending-title"
      className="mt-8 border-l-4 border-safecrib-green bg-[#EAF7F1] px-5 py-7 sm:px-7"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-safecrib-green">
        Submitted · Awaiting approval
      </p>
      <h2
        id="review-pending-title"
        className="mt-3 text-2xl font-medium text-safecrib-black"
      >
        Congratulations, your {isProviderPage ? "Provider Page" : "student profile"} is complete.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">
        The SafeCrib review team has received your submission and is checking the
        information. We’ll notify you when a decision is made. You don’t need to
        submit it again.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-safecrib-green/15 pt-4 text-sm font-medium">
        <Link href="/support" className="text-safecrib-green underline underline-offset-2">
          Contact support
        </Link>
        <Link href="/dashboard" className="text-black/65 underline underline-offset-2">
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}