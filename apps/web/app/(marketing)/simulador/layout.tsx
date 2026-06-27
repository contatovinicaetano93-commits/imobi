import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Envie seu Projeto — IMOBI",
  description: "Envie a documentação do empreendimento. Nossa equipe analisa a viabilidade e estrutura a operação de crédito.",
  openGraph: {
    title: "Envie seu Projeto — IMOBI",
    description: "Documentação do empreendimento + análise de viabilidade.",
    type: "website",
    url: "https://imobi-web-ten.vercel.app/envie-seu-projeto",
  },
  twitter: {
    card: "summary_large_image",
    title: "Envie seu Projeto — IMOBI",
    description: "Documentação do empreendimento + análise de viabilidade.",
  },
  alternates: { canonical: "https://imobi-web-ten.vercel.app/envie-seu-projeto" },
};

export default function SimuladorLayout({ children }: { children: ReactNode }) {
  return children;
}
