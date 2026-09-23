"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SafeCribLogo } from "@/components/branding/SafeCribLogo";

type DashboardNavProps = {
  onCreatePage: () => void;
  onSignOut: () => void;
  pageStatus: "none" | "pending" | "approved" | "rejected";
  canManagePage?: boolean;
  displayName?: string;
  profileImage?: string | null;
};

const items = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/profile", label: "Profile", icon: "◎" },
];

export function DashboardNav({ onCreatePage, onSignOut, pageStatus, canManagePage = true, displayName, profileImage }: DashboardNavProps) {
  const pathname = usePathname();
  const pageLabel = pageStatus === "none" ? "Page" : "My Page";
  const avatar = (size: string, pixels: number) => profileImage ? <Image src={profileImage} alt="" width={pixels} height={pixels} unoptimized className={`${size} rounded-full object-cover`} /> : <span className={`${size} flex items-center justify-center rounded-full border border-safecrib-green/25 bg-safecrib-green/10 text-safecrib-green`} aria-label={displayName ? `${displayName} profile image` : "Add a profile image"}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-1/2 w-1/2 fill-none stroke-current" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path d="M4.8 20c.9-3.3 3.3-5 7.2-5s6.3 1.7 7.2 5" strokeLinecap="round" /></svg></span>;

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
          <Link href="/profile" aria-label="Open profile" className="ml-1 rounded-full">{avatar("h-9 w-9", 36)}</Link>
        </nav>
      </div>
      <nav aria-label="Mobile dashboard navigation" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-black/10 bg-safecrib-white pb-[var(--safe-area-bottom)] md:hidden">
        <Link href="/dashboard" className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${pathname === "/dashboard" ? "text-safecrib-green" : "text-black/60"}`}>
          <span aria-hidden="true" className="text-xl leading-none">⌂</span><span>Home</span>
        </Link>
        {canManagePage && <button type="button" onClick={onCreatePage} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-black/60"><span aria-hidden="true" className="text-2xl leading-none">+</span><span>{pageLabel}</span></button>}
        <Link href="/profile" className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${pathname === "/profile" ? "text-safecrib-green" : "text-black/60"}`}>
          {avatar("h-7 w-7", 28)}<span>Profile</span>
        </Link>
      </nav>
    </header>
  );
}