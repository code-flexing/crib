"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

export function InitialPageLoader() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem("safecrib_initial_loader_seen");
  });
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    sessionStorage.setItem("safecrib_initial_loader_seen", "1");

    const exitTimer = window.setTimeout(() => setIsExiting(true), 1600);
    const hideTimer = window.setTimeout(() => setVisible(false), 2000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  return visible ? <PageLoader label="Loading SafeCrib" isExiting={isExiting} /> : null;
}