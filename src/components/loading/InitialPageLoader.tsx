"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "./PageLoader";

export function InitialPageLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000);

    return () => window.clearTimeout(timer);
  }, []);

  return visible ? <PageLoader label="Loading SafeCrib" /> : null;
}