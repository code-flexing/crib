import { SafeCribLogo } from "@/components/branding/SafeCribLogo";
import { NotificationForm } from "@/components/notifications/NotificationForm";
import { InstallButton } from "@/components/pwa/InstallButton";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-content flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-16">
      <header className="flex items-center justify-between">
        <SafeCribLogo height={26} />
        <span className="text-xs tracking-wide text-black/45">Under development</span>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-16 py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-0">
        <div className="max-w-xl">
          <h1 className="font-display text-[2.25rem] leading-[1.15] text-safecrib-black sm:text-[2.75rem] lg:text-[3.25rem]">
            Student accommodation, built around trust.
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-black/60">
            Something better for finding a place to live is being built.SafeCrib is creating a
            more trusted way for students to discover verified accommodation.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <NotificationForm />
            <InstallButton />
          </div>
        </div>

      </div>

      <footer className="text-xs text-black/30">SafeCrib</footer>
    </main>
  );
}
