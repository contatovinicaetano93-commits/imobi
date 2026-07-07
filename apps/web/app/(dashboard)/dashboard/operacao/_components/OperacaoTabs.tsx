"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HardHat, CreditCard } from "lucide-react";
import { PanelTabs } from "@/components/dashboard/PanelTabs";

type TabId = "obras" | "credito";

type Props = {
  obras: ReactNode;
  credito: ReactNode;
};

const TABS = [
  { id: "obras", label: "Obras", icon: HardHat },
  { id: "credito", label: "Crédito", icon: CreditCard },
] as const;

/** Painel "Minha operação" — obra (projeto) e crédito (financeiro) em abas. */
export function OperacaoTabs({ obras, credito }: Props) {
  const [active, setActive] = useState<TabId>("obras");

  // Permite deep-link: /dashboard/operacao#credito
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "credito" || hash === "obras") setActive(hash);
  }, []);

  const handleChange = (id: string) => {
    const tab = id === "credito" ? "credito" : "obras";
    setActive(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  return (
    <div>
      <div className="px-4 pt-4 sm:px-6 sm:pt-6 max-w-4xl">
        <PanelTabs tabs={[...TABS]} active={active} onChange={handleChange} />
      </div>

      <div role="tabpanel">
        {active === "obras" ? (
          obras
        ) : (
          <div className="p-4 sm:p-6 max-w-4xl">{credito}</div>
        )}
      </div>
    </div>
  );
}
