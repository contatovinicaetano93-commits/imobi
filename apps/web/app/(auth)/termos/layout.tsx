import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Termos de Uso — IMOBI",
  description: "Termos de serviço da plataforma IMOBI para crédito de obra.",
  openGraph: {
    title: "Termos de Uso — IMOBI",
    description: "Termos de serviço da plataforma IMOBI.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function TermosLayout({ children }: { children: ReactNode }) {
  return children;
}
