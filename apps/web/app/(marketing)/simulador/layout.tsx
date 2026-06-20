import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Simulador de crédito — IMOBI",
  description: "Descubra em 2 minutos quanto sua obra pode financiar. Estimativa preliminar sem compromisso.",
  openGraph: {
    title: "Simulador de crédito — IMOBI",
    description: "Simule crédito de obra em 2 minutos.",
    type: "website",
    url: "https://imobi-web-ten.vercel.app/simulador",
  },
  twitter: {
    card: "summary_large_image",
    title: "Simulador de crédito — IMOBI",
    description: "Simule crédito de obra em 2 minutos.",
  },
  alternates: { canonical: "https://imobi-web-ten.vercel.app/simulador" },
};

export default function SimuladorLayout({ children }: { children: ReactNode }) {
  return children;
}
