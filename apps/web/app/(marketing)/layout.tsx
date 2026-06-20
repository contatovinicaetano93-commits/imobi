import type { Metadata } from "next";
import type { ReactNode } from "react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imobi-web-ten.vercel.app";

export const metadata: Metadata = {
  title: "IMOBI — Crédito imobiliário para construtoras",
  description:
    "Crédito desburocratizado para construtoras. Documentação simplificada, versatilidade de modalidades e aprovação em tempo recorde.",
  openGraph: {
    title: "IMOBI — Crédito para sua obra em dias",
    description: "Crédito desburocratizado para construtoras. Documentação simplificada e aprovação em tempo recorde.",
    type: "website",
    locale: "pt_BR",
    siteName: "IMOBI",
    url: siteUrl,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "IMOBI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IMOBI — Crédito para sua obra em dias",
    description: "Crédito desburocratizado para construtoras. Aprovação em tempo recorde e documentação simplificada.",
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: { canonical: siteUrl },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
