"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

export function InitialPageLoader() {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 1600);
    const hideTimer = window.setTimeout(() => setVisible(false), 2000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return <PageLoader label="Loading SafeCrib" isExiting={isExiting} />;
}