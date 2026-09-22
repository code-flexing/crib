"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";

type DashboardNavProps = {
  onCreatePage: () => void;
  onSignOut: () => void;
  pageStatus: "none" | "pending" | "approved" | "rejected";
  canManagePage?: boolean;
};

const items = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/profile", label: "Profile", icon: "◎" },
];

export function DashboardNav({ onCreatePage, onSignOut, pageStatus, canManagePage = true }: DashboardNavProps) {
  const pathname = usePathname();
  const pageLabel = pageStatus === "none" ? "Page" : "My Page";

  return (
    <header className="border-b border-black/10 bg-safecrib-white md:sticky md:top-0 md:z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/dashboard" aria-label="SafeCrib home" className="hidden md:block">
          <SafeCribLogo height={28} href={false} />
        </Link>
        <nav aria-label="Dashboard navigation" className="hidden items-center gap-2 md:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-[4px] px-4 py-2 text-sm font-medium ${pathname === item.href ? "bg-safecrib-green/10 text-safecrib-green" : "text-black/60 hover:bg-black/[0.03] hover:text-safecrib-black"}`}>
              {item.label}
            </Link>
          ))}
          {canManagePage && <button type="button" onClick={onCreatePage} className="rounded-[4px] px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/[0.03] hover:text-safecrib-black">+ {pageLabel}</button>}
          <button type="button" onClick={onSignOut} className="ml-2 rounded-[4px] border border-black/15 px-4 py-2 text-sm font-medium text-safecrib-black hover:bg-black/[0.03]">
            Sign out
          </button>
        </nav>
      </div>
      <nav aria-label="Mobile dashboard navigation" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-black/10 bg-safecrib-white pb-[var(--safe-area-bottom)] md:hidden">
        <Link href="/dashboard" className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${pathname === "/dashboard" ? "text-safecrib-green" : "text-black/60"}`}>
          <span aria-hidden="true" className="text-xl leading-none">⌂</span><span>Home</span>
        </Link>
        {canManagePage && <button type="button" onClick={onCreatePage} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-black/60"><span aria-hidden="true" className="text-2xl leading-none">+</span><span>{pageLabel}</span></button>}
        <Link href="/profile" className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${pathname === "/profile" ? "text-safecrib-green" : "text-black/60"}`}>
          <span aria-hidden="true" className="text-xl leading-none">◎</span><span>Profile</span>
        </Link>
      </nav>
    </header>
  );
}