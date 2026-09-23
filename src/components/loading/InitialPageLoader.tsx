"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

export function InitialPageLoader() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem("safecrib_initial_loader_seen");
  });

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem("safecrib_initial_loader_seen", "1");
    const timer = window.setTimeout(() => setVisible(false), 1000);

    return () => window.clearTimeout(timer);
  }, [visible]);

  return visible ? <PageLoader label="Loading SafeCrib" /> : null;
}