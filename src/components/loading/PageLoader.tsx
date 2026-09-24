import { SafeCribLoader } from "./SafeCribLoader";

/**
 * The single, consistent full-screen loading experience for SafeCrib.
 * Use this anywhere the whole page/route needs to signal it isn't ready
 * yet — do not build page-specific loading screens.
 */
export function PageLoader({ label, isExiting = false }: { label?: string; isExiting?: boolean }) {
  return <SafeCribLoader fullscreen label={label} isExiting={isExiting} />;
}
