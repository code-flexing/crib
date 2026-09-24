import Image from "next/image";

type SafeCribLoaderSize = "sm" | "md" | "lg";

type SafeCribLoaderProps = {
  size?: SafeCribLoaderSize;
  /** Renders as a centered, full-viewport overlay instead of an inline mark. */
  fullscreen?: boolean;
  /** Announced to assistive tech in place of the default "Loading" label. */
  label?: string;
  className?: string;
  isExiting?: boolean;
};

const DIMENSIONS: Record<SafeCribLoaderSize, number> = {
  sm: 20,
  md: 40,
  lg: 88,
};

/** The SafeCrib global loader. */
export function SafeCribLoader({
  size = "md",
  fullscreen = false,
  label = "Loading",
  className,
  isExiting = false,
}: SafeCribLoaderProps) {
  const dimension = fullscreen ? 72 : DIMENSIONS[size];

  const mark = (
    <Image
      className={`safecrib-loader ${className ?? ""} ${isExiting ? "safecrib-loader--exiting" : ""}`.trim()}
      src="/logo.png"
      width={dimension}
      height={dimension}
      alt={label}
      priority
    />
  );

  if (!fullscreen) return mark;

  return (
    <div
      className={`safecrib-loader-overlay ${isExiting ? "is-exiting" : "is-entering"}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {mark}
    </div>
  );
}
