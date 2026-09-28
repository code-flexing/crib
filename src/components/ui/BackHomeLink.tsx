import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export function BackHomeLink({ href = "/dashboard", label = "Back to home", className = "" }: { href?: string; label?: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={`safecrib-back-home inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border px-0 text-sm font-semibold shadow-sm backdrop-blur-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-safecrib-green sm:w-auto sm:px-4 ${className}`}>
      <Icon name="back" className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
