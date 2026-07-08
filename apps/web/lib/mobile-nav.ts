import { Menu, type LucideIcon } from "lucide-react";
import { MOBILE_TAB_SHORT } from "@/lib/imobi-tokens";

export type MobileNavSource = {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
};

export type MobileTabItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Abre o drawer em vez de navegar. */
  isMenu?: boolean;
};

const MENU_TAB: MobileTabItem = {
  href: "__menu__",
  label: "Menu",
  shortLabel: "Menu",
  icon: Menu,
  isMenu: true,
};

/**
 * Divide a nav canônica em até 4 abas primárias + "Menu" (conta e overflow no drawer).
 * Padrão SOMA: bottom tab nav com item ativo destacado.
 */
export function buildMobileTabs(nav: MobileNavSource[]): {
  tabs: MobileTabItem[];
  drawerItems: MobileNavSource[];
} {
  const primary = nav.filter((item) => item.section !== "conta").slice(0, 4);
  const tabs: MobileTabItem[] = primary.map((item) => ({
    href: item.href,
    label: item.label,
    shortLabel: MOBILE_TAB_SHORT[item.href] ?? truncateLabel(item.label),
    icon: item.icon,
  }));

  if (tabs.length > 0) {
    tabs.push(MENU_TAB);
  }

  return { tabs, drawerItems: nav };
}

function truncateLabel(label: string): string {
  const first = label.split(/\s+/)[0] ?? label;
  return first.length > 10 ? `${first.slice(0, 9)}.` : first;
}

/** Verifica se a aba corresponde ao único item ativo resolvido pela navegação. */
export function isMobileTabActive(_pathname: string, href: string, activeHref: string): boolean {
  if (href === "__menu__") return false;
  return href === activeHref;
}
