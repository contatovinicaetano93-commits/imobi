import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Política de Privacidade — IMOBI",
  description: "Como a IMOBI coleta, usa e protege seus dados pessoais.",
  openGraph: {
    title: "Política de Privacidade — IMOBI",
    description: "Política de privacidade da plataforma IMOBI.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
