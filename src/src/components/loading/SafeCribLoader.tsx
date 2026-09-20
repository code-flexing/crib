type SafeCribLoaderSize = "sm" | "md" | "lg";

type SafeCribLoaderProps = {
  size?: SafeCribLoaderSize;
  /** Renders as a centered, full-viewport overlay instead of an inline mark. */
  fullscreen?: boolean;
  /** Announced to assistive tech in place of the default "Loading" label. */
  label?: string;
  className?: string;
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
}: SafeCribLoaderProps) {
  const dimension = fullscreen ? DIMENSIONS.lg : DIMENSIONS[size];

  const mark = (
    <img
      className={`safecrib-loader ${className ?? ""}`}
      src="/logo.png"
      width={dimension}
      height={dimension}
      alt={label}
    />
  );

  if (!fullscreen) return mark;

  return (
    <div className="safecrib-loader-overlay" role="status" aria-live="polite">
      {mark}
    </div>
  );
}
