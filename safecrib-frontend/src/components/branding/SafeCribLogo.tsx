"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/theme/ThemeProvider";

type SafeCribLogoProps = {
  /** Rendered height in pixels; width scales to preserve the logo's aspect ratio. */
  height?: number;
  /** Wraps the mark in a link to "/". Defaults to true. */
  href?: string | false;
  className?: string;
  priority?: boolean;
};

/**
 * Renders the official SafeCrib logo using the variant that matches the active theme.
 */
export function SafeCribLogo({
  height = 42,
  href = "/",
  className,
  priority = true,
}: SafeCribLogoProps) {
  const { resolvedTheme } = useTheme();
  const logoSource = resolvedTheme === "light" ? "/logo(black).png" : "/logo(light).png";
  const mark = (
    <Image
      src={logoSource}
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
