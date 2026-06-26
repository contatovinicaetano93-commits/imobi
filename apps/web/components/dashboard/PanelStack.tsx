import type { ReactNode } from "react";

type PanelStackProps = {
  children: ReactNode;
  className?: string;
};

/** Espaçamento vertical padrão entre seções colapsáveis do painel. */
export function PanelStack({ children, className = "" }: PanelStackProps) {
  return <div className={`flex flex-col gap-4 ${className}`}>{children}</div>;
}
