"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/app/providers";
import { initSentry } from "@/lib/sentry";

// Initialize Sentry on first load
if (typeof window !== "undefined") {
  initSentry();
}

export default function RootLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Sentry on component mount as fallback
    initSentry();
  }, []);

  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
