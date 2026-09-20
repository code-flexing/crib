import { SafeCribLoader } from "./SafeCribLoader";

/**
 * The single, consistent full-screen loading experience for SafeCrib.
 * Use this anywhere the whole page/route needs to signal it isn't ready
 * yet — do not build page-specific loading screens.
 */
export function PageLoader({ label }: { label?: string }) {
  return <SafeCribLoader fullscreen label={label} />;
}
