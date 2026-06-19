"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { initSentry } from "@/lib/sentry";
import "./globals.css";

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
        <a
          href="#main-content"
          style={{
            position: "absolute",
            top: -9999,
            left: 0,
            zIndex: 9999,
            padding: "0.75rem 1.5rem",
            background: "#0C1A3D",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            borderRadius: "0 0 8px 0",
          }}
          onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = "0"; }}
          onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = "-9999px"; }}
        >
          Pular para o conteúdo principal
        </a>
        <div id="main-content">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
