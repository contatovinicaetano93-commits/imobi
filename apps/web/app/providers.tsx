"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { initSentry } from "@/lib/sentry";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
