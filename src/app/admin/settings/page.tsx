import { AccountSettingsPanel } from "@/components/settings/AccountSettingsPanel";
import { SettingsSignOutButton } from "@/components/settings/SettingsSignOutButton";

export default function AdminSettingsPage() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-safecrib-green">Administrator</p>
      <h1 className="mt-2 text-3xl font-medium text-safecrib-black">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">Manage the administrator account used to access SafeCrib operations.</p>
      <AccountSettingsPanel heading="Administrator account" />
      <p className="mt-4 text-xs leading-5 text-black/45">Administrator role and membership are managed by SafeCrib and cannot be changed here.</p>
      <SettingsSignOutButton admin />
    </div>
  );
}
