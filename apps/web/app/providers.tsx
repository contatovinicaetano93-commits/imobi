"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";

const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);

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
