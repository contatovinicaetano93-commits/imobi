import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "IMOBI — Crédito imobiliário para construtoras",
  description:
    "Simule em 2 minutos quanto sua obra pode financiar. Liberação por etapa, validação GPS e aprovação em dias.",
  openGraph: {
    title: "IMOBI — Crédito para sua obra em dias",
    description: "Crédito imobiliário estruturado para construtoras e incorporadoras.",
    type: "website",
    locale: "pt_BR",
    siteName: "IMOBI",
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
