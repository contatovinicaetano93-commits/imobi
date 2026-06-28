import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Envie seu projeto — IMOBI",
  description: "Envie a documentação do empreendimento para análise de viabilidade e crédito.",
  openGraph: {
    title: "Envie seu projeto — IMOBI",
    description: "Documentação e viabilidade — nossa equipe analisa e estrutura o crédito com você.",
    type: "website",
    url: "https://imobi-web-ten.vercel.app/envie-seu-projeto",
  },
  twitter: {
    card: "summary_large_image",
    title: "Envie seu projeto — IMOBI",
    description: "Documentação e viabilidade — nossa equipe analisa e estrutura o crédito com você.",
  },
  alternates: { canonical: "https://imobi-web-ten.vercel.app/envie-seu-projeto" },
};

export default function SimuladorLayout({ children }: { children: ReactNode }) {
  return children;
}
