"use client";

import { useEffect, type ReactNode } from "react";
import { initSentry } from "@/lib/sentry";

export function ClientLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    initSentry();
  }, []);

  return <>{children}</>;
}
