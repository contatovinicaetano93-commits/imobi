import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ClientInit } from "./client-init";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientInit />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
