import type { Metadata } from "next";
import type { ReactNode } from "react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imobi-web-ten.vercel.app";

export const metadata: Metadata = {
  title: "Simulador de crédito — IMOBI",
  description: "Descubra em 2 minutos quanto sua obra pode financiar. Estimativa preliminar sem compromisso.",
  alternates: { canonical: `${siteUrl}/simulador` },
  openGraph: {
    url: `${siteUrl}/simulador`,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "IMOBI" }],
  },
};

export default function SimuladorLayout({ children }: { children: ReactNode }) {
  return children;
}
