import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: "Imobi - Soluções de Crédito para Imóveis",
  description: "Plataforma fintech de crédito imobiliário",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="description" content="Plataforma fintech de crédito imobiliário" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
