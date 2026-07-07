"use client";

import type { ReactNode } from "react";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";
import { buildConstrutorTabs } from "./construtor-panel-config";

type Props = {
  mvpMode: boolean;
  hasAlertas: boolean;
  hasNotifs: boolean;
  liberacoesPriority: "critical" | "primary";
  kycPriority: "critical" | "primary" | "secondary";
  /** Conteúdo renderizado no servidor — chave = id da aba. */
  tabContent: Record<string, ReactNode>;
};

/**
 * Wrapper client do painel do construtor.
 *
 * Os ícones das abas (lucide) são funções e não podem cruzar a fronteira
 * Server → Client Component. Por isso a config de abas é montada aqui, no
 * cliente, enquanto o conteúdo (já renderizado no servidor) chega via props.
 */
export function ConstrutorShell({ tabContent, ...opts }: Props) {
  const tabs = buildConstrutorTabs(opts);
  return <DashboardPanelShell tabs={tabs} maxWidth="sm" tabContent={tabContent} />;
}
