import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Envie seu Projeto — IMOBI",
  description:
    "Envie documentação do empreendimento para análise de crédito imobiliário. Obra nova, em andamento ou crédito ponte.",
  openGraph: {
    title: "Envie seu Projeto — IMOBI",
    description: "Originação proativa — documentação e viabilidade antes da simulação de crédito.",
    url: "https://imobi-web-ten.vercel.app/envie-seu-projeto",
  },
  alternates: { canonical: "https://imobi-web-ten.vercel.app/envie-seu-projeto" },
};

export default function EnvieSeuProjetoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
