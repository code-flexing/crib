"use client";

import { useRouter } from "next/navigation";
import { logoutSession } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

export function SettingsSignOutButton({ admin = false }: { admin?: boolean }) {
  const router = useRouter();

  const signOut = () => {
    void logoutSession().finally(() => router.replace(admin ? "/admin/login" : "/login"));
  };

  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t border-black/10 pt-6">
      <p className="text-sm text-black/55">End this session on this device.</p>
      <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">
        <Icon name="logout" className="h-5 w-5" />
      </button>
    </div>
  );
}
