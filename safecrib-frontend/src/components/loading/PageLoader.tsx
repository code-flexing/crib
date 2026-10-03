import { SafeCribLoader } from "./SafeCribLoader";

/** Inline SafeCrib loading indicator for route content that has no cached data yet. */
export function PageLoader({ label, isExiting = false }: { label?: string; isExiting?: boolean }) {
  return (
    <div className="flex min-h-[28vh] w-full items-center justify-center py-8" role="status" aria-live="polite" aria-label={label ?? "Loading"}>
      <SafeCribLoader size="md" label={label} isExiting={isExiting} />
    </div>
  );
}
