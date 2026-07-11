/**
 * Navegação guiada por painel — 4 papéis canônicos.
 */

import { normalizeRole, ROLE_HOME, type AppRole } from '@/lib/role-permissions';

export const ACCOUNT_NAV_HREFS = new Set([
  '/dashboard/notificacoes',
  '/dashboard/perfil',
]);

type NavOverride = {
  pattern: RegExp;
  navRole: AppRole;
  targetHref: string;
};

const ACTIVE_NAV_OVERRIDES: NavOverride[] = [
  { pattern: /^\/dashboard\/cliente\/obra/, navRole: 'CLIENTE', targetHref: '/dashboard/cliente/obra' },
  { pattern: /^\/dashboard\/cliente\/documentos/, navRole: 'CLIENTE', targetHref: '/dashboard/cliente/documentos' },
  { pattern: /^\/dashboard\/obras/, navRole: 'ENGENHEIRO', targetHref: '/dashboard/engenheiro' },
  { pattern: /^\/dashboard\/engenheiro\/vistoria/, navRole: 'ENGENHEIRO', targetHref: '/dashboard/engenheiro/vistoria' },
];

export type PanelId = AppRole;

export type NavContext = {
  adminPreview?: AppRole | null;
  fromAdmin?: boolean;
};

export const ADMIN_PREVIEW_STORAGE_KEY = 'imobi_admin_preview';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type NavHrefItem = { href: string };

function isRootDashboard(seg: string): boolean {
  return seg === '' || seg === 'dashboard';
}

export function getActiveNavHref(
  path: string,
  navRole: AppRole | null,
  items: NavHrefItem[],
): string | null {
  const normalized = path.split('?')[0] ?? path;

  if (navRole) {
    for (const override of ACTIVE_NAV_OVERRIDES) {
      if (override.navRole !== navRole || !override.pattern.test(normalized)) continue;
      const item = items.find((i) => i.href === override.targetHref);
      if (item) return item.href;
    }
  }

  let best: string | null = null;
  for (const item of items) {
    const { href } = item;
    const matches =
      href === '/dashboard'
        ? normalized === href
        : normalized === href || normalized.startsWith(`${href}/`);
    if (matches && (!best || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}

export function getDashboardSegment(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[1] ?? '';
}

export function getPanelFromPath(path: string): AppRole | null {
  const seg = getDashboardSegment(path);
  if (seg === 'engenheiro') return 'ENGENHEIRO';
  if (seg === 'fundo' || seg === 'gestor') return 'FUNDO';
  if (seg === 'cliente' || seg === 'construtor' || seg === 'kyc' || seg === 'operacao') return 'CLIENTE';
  if (seg === 'admin') return null;
  return null;
}

export function getNavRole(
  role: AppRole | null,
  path: string,
  ctx?: NavContext,
): AppRole | null {
  if (!role) return null;

  const r = normalizeRole(role) ?? role;
  const seg = getDashboardSegment(path);

  if (seg === 'admin') return 'ADMIN';
  if (seg === 'engenheiro') return 'ENGENHEIRO';
  if (seg === 'fundo' || seg === 'gestor') return 'FUNDO';
  if (seg === 'cliente' || seg === 'construtor' || seg === 'kyc' || seg === 'operacao' || seg === 'obras') {
    if (r === 'CLIENTE') return 'CLIENTE';
  }

  if (r === 'ADMIN') {
    const explicit = getPanelFromPath(path);
    if (explicit) return explicit;

    const preview = ctx?.adminPreview;
    const fromAdmin = ctx?.fromAdmin === true;
    if (preview && !fromAdmin && (seg === 'obras' || seg === 'perfil' || seg === 'notificacoes')) {
      return preview;
    }

    if (isRootDashboard(seg)) return 'ADMIN';
    return 'ADMIN';
  }

  return r;
}

export function isAdminPreviewingPanel(
  role: AppRole | null,
  path: string,
  ctx?: NavContext,
): boolean {
  return role === 'ADMIN' && getNavRole(role, path, ctx) !== 'ADMIN';
}

export function getPanelHome(role: AppRole | null, path?: string, ctx?: NavContext): string {
  if (!role) return '/dashboard';
  const navRole = path ? getNavRole(role, path, ctx) : normalizeRole(role) ?? role;
  if (!navRole) return '/dashboard';
  return ROLE_HOME[navRole] ?? '/dashboard';
}

export function getObrasListPath(role: string | null | undefined): string {
  const r = normalizeRole(role);
  switch (r) {
    case 'ADMIN':
      return '/dashboard/admin';
    case 'FUNDO':
      return '/dashboard/fundo';
    case 'ENGENHEIRO':
      return '/dashboard/engenheiro';
    case 'CLIENTE':
      return '/dashboard/cliente/obra';
    default:
      return '/dashboard/cliente/obra';
  }
}

export function getObrasListLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  if (r === 'ADMIN') return 'Centro de comando';
  if (r === 'FUNDO') return 'Dashboard do fundo';
  if (r === 'ENGENHEIRO') return 'Minhas obras';
  return 'Minha obra';
}

export function getObraDetailBreadcrumbs(
  role: string | null | undefined,
  obraNome: string,
): BreadcrumbItem[] {
  const r = normalizeRole(role);
  const items: BreadcrumbItem[] = [];

  if (r === 'ADMIN') {
    items.push({ label: 'Admin', href: '/dashboard/admin' });
  } else if (r === 'FUNDO') {
    items.push({ label: 'Fundo', href: '/dashboard/fundo' });
  } else {
    items.push({ label: getObrasListLabel(role), href: getObrasListPath(role) });
  }

  items.push({ label: obraNome });
  return items;
}

export const SIPOC_OBRAS_FLOW = [
  { step: 0, label: 'Documentos', actor: 'Cliente', desc: 'KYC e documentos da obra' },
  { step: 1, label: 'Cadastro', actor: 'Cliente', desc: 'Obra criada com valor de crédito' },
  { step: 2, label: 'Homologação', actor: 'Admin', desc: 'Validação e engenheiro vinculado' },
  { step: 3, label: 'Vistoria', actor: 'Engenheiro', desc: 'Validação técnica por tranche' },
  { step: 4, label: 'Liberação', actor: 'Admin', desc: 'Transferência e confirmação' },
  { step: 5, label: 'Quitado', actor: 'Sistema', desc: 'Crédito totalmente liberado' },
] as const;
