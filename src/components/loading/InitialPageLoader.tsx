"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

export function InitialPageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setVisible(true);
    setIsExiting(false);

    const exitTimer = window.setTimeout(() => setIsExiting(true), 650);
    const hideTimer = window.setTimeout(() => setVisible(false), 1000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return <PageLoader label="Loading SafeCrib" isExiting={isExiting} />;
}