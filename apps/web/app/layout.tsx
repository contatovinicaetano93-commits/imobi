import type { ReactNode } from "react";
import { ClientProviders } from "./providers";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
