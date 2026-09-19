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

/**
 * The SafeCrib global loader.
 *
 * Visual concept — trust, connection, home: three points draw two connecting
 * lines and a ground line in sequence, then settle into a single quiet
 * breathing pulse. It is not a spinner; it is a small system arriving at
 * readiness. Pure SVG stroke/opacity animation — no animation library.
 */
export function SafeCribLoader({
  size = "md",
  fullscreen = false,
  label = "Loading",
  className,
}: SafeCribLoaderProps) {
  const dimension = fullscreen ? DIMENSIONS.lg : DIMENSIONS[size];

  const mark = (
    <svg
      className={`safecrib-loader ${className ?? ""}`}
      width={dimension}
      height={dimension}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
    >
      <path
        className="safecrib-loader__line safecrib-loader__line--left"
        d="M8 34L24 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        className="safecrib-loader__line safecrib-loader__line--right"
        d="M24 10L40 34"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        className="safecrib-loader__line safecrib-loader__line--base"
        d="M8 34L40 34"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle className="safecrib-loader__node safecrib-loader__node--apex" cx="24" cy="10" r="3" fill="currentColor" />
      <circle className="safecrib-loader__node safecrib-loader__node--left" cx="8" cy="34" r="3" fill="currentColor" />
      <circle className="safecrib-loader__node safecrib-loader__node--right" cx="40" cy="34" r="3" fill="currentColor" />
    </svg>
  );

  if (!fullscreen) return mark;

  return (
    <div className="safecrib-loader-overlay" role="status" aria-live="polite">
      {mark}
    </div>
  );
}
