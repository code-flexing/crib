import Image from "next/image";
import Link from "next/link";

type SafeCribLogoProps = {
  /** Rendered height in pixels; width scales to preserve the logo's aspect ratio. */
  height?: number;
  /** Wraps the mark in a link to "/". Defaults to true. */
  href?: string | false;
  className?: string;
  priority?: boolean;
};

/**
 * Renders the official SafeCrib logo exactly as supplied at /public/logo.png.
 * This component never recolors, distorts, or reconstructs the mark — it only
 * controls layout (sizing, optional home link, loading priority).
 */
export function SafeCribLogo({
  height = 32,
  href = "/",
  className,
  priority = true,
}: SafeCribLogoProps) {
  const mark = (
    <Image
      src="/logo.png"
      alt="SafeCrib"
      height={height}
      width={height * 5}
      style={{ height, width: "auto" }}
      priority={priority}
      className={className}
    />
  );

  if (!href) return mark;

  return (
    <Link
      href={href}
      aria-label="SafeCrib home"
      className="inline-flex items-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-safecrib-green"
    >
      {mark}
    </Link>
  );
}
