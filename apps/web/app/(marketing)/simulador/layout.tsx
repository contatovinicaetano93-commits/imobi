import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Simulador de crédito — IMOBI",
  description: "Descubra em 2 minutos quanto sua obra pode financiar. Estimativa preliminar sem compromisso.",
};

export default function SimuladorLayout({ children }: { children: ReactNode }) {
  return children;
}
