/**
 * Navegação guiada por painel — fonte única para sidebar, breadcrumbs e retorno.
 * Evita que perfis "se percam" ao acessar rotas compartilhadas (obras, fundos, etc.).
 */

import { normalizeRole, ROLE_HOME, type AppRole } from '@/lib/role-permissions';

/** Segmentos que pertencem ao painel Construtor/Tomador (cliente) */
const CONSTRUTOR_PANEL_SEGMENTS = new Set([
  'construtor',
  'credito',
  'kyc',
  'score',
  'simulador',
  'comite',
]);

/** Rotas compartilhadas — mantêm o contexto do perfil real (não trocam sidebar) */
const SHARED_SEGMENTS = new Set([
  'obras',
  'fundos',
  'relatorios',
  'notificacoes',
  'perfil',
]);

/** Itens de conta — renderizados por último na sidebar */
export const ACCOUNT_NAV_HREFS = new Set([
  '/dashboard/notificacoes',
  '/dashboard/perfil',
]);

type NavOverride = {
  pattern: RegExp;
  navRole: AppRole;
  targetHref: string;
};

/** Destaque correto em rotas aninhadas / compartilhadas (mesmo padrão do admin/obras). */
const ACTIVE_NAV_OVERRIDES: NavOverride[] = [
  { pattern: /^\/dashboard\/obras\/[^/]+/, navRole: 'ADMIN', targetHref: '/dashboard/admin/obras' },
  { pattern: /^\/dashboard\/obras(?:\/|$)/, navRole: 'TOMADOR', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras(?:\/|$)/, navRole: 'CONSTRUTOR', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras(?:\/|$)/, navRole: 'ENGENHEIRO', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras(?:\/|$)/, navRole: 'GESTOR_OBRA', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras\/[^/]+/, navRole: 'ENGENHEIRO', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras\/[^/]+/, navRole: 'GESTOR_OBRA', targetHref: '/dashboard/obras' },
  { pattern: /^\/dashboard\/obras\/[^/]+/, navRole: 'GESTOR', targetHref: '/dashboard/gestor/etapas' },
  { pattern: /^\/dashboard\/credito/, navRole: 'TOMADOR', targetHref: '/dashboard/credito' },
  { pattern: /^\/dashboard\/credito/, navRole: 'CONSTRUTOR', targetHref: '/dashboard/credito' },
  { pattern: /^\/dashboard\/kyc/, navRole: 'TOMADOR', targetHref: '/dashboard/kyc' },
  { pattern: /^\/dashboard\/kyc/, navRole: 'CONSTRUTOR', targetHref: '/dashboard/kyc' },
  { pattern: /^\/dashboard\/proposta-credito/, navRole: 'TOMADOR', targetHref: '/dashboard/proposta-credito' },
  { pattern: /^\/dashboard\/proposta-credito/, navRole: 'CONSTRUTOR', targetHref: '/dashboard/proposta-credito' },
  { pattern: /^\/dashboard\/simulador/, navRole: 'TOMADOR', targetHref: '/dashboard/proposta-credito' },
  { pattern: /^\/dashboard\/simulador/, navRole: 'CONSTRUTOR', targetHref: '/dashboard/proposta-credito' },
  { pattern: /^\/dashboard\/admin\/kyc/, navRole: 'ADMIN', targetHref: '/dashboard/admin/kyc' },
  { pattern: /^\/dashboard\/admin\/propostas/, navRole: 'ADMIN', targetHref: '/dashboard/admin/propostas' },
  { pattern: /^\/dashboard\/admin\/vistorias/, navRole: 'ADMIN', targetHref: '/dashboard/admin/vistorias' },
  { pattern: /^\/dashboard\/admin\/viabilidade/, navRole: 'ADMIN', targetHref: '/dashboard/admin/viabilidade' },
  { pattern: /^\/dashboard\/gestor\/kyc/, navRole: 'GESTOR', targetHref: '/dashboard/gestor/kyc' },
  { pattern: /^\/dashboard\/gestor\/etapas/, navRole: 'GESTOR', targetHref: '/dashboard/gestor/etapas' },
  { pattern: /^\/dashboard\/gestor\/comite/, navRole: 'GESTOR', targetHref: '/dashboard/gestor/comite' },
];

export type PanelId = AppRole;

export type NavContext = {
  /** Admin visualizando outro painel — mantém sidebar ao entrar em rotas compartilhadas */
  adminPreview?: AppRole | null;
  /** Obra aberta a partir do Centro de Comando admin (?from=admin) */
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

/**
 * Resolve o único item ativo da sidebar (maior prefixo correspondente).
 * Evita marcar "Visão Geral" e "Comitê" ao mesmo tempo em /dashboard/admin/comite.
 */
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

/** Segmento principal após /dashboard */
export function getDashboardSegment(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[1] ?? '';
}

/** Painel explícito na URL (admin previewing engenheiro/gestor/etc.) */
export function getPanelFromPath(path: string): AppRole | null {
  const seg = getDashboardSegment(path);
  if (seg === 'engenheiro') return 'ENGENHEIRO';
  if (seg === 'gestor') {
    const sub = path.split('/').filter(Boolean)[2];
    if (sub === 'kyc' || sub === 'etapas') return null;
    return 'GESTOR';
  }
  if (seg === 'construtor' || CONSTRUTOR_PANEL_SEGMENTS.has(seg)) return 'CONSTRUTOR';
  if (seg === 'comercial') return 'COMERCIAL';
  if (seg === 'admin') return null;
  return null;
}

/**
 * Define qual menu lateral exibir.
 * Cada perfil permanece no seu painel em rotas compartilhadas (padrão admin).
 */
export function getNavRole(
  role: AppRole | null,
  path: string,
  ctx?: NavContext,
): AppRole | null {
  if (!role) return null;

  const r = normalizeRole(role) ?? role;
  const seg = getDashboardSegment(path);

  if (seg === 'admin') return 'ADMIN';
  if (seg === 'comercial') return 'COMERCIAL';
  if (seg === 'gestor') {
    if (r === 'ADMIN') {
      const sub = path.split('/').filter(Boolean)[2];
      if (sub === 'kyc' || sub === 'etapas') return 'ADMIN';
      return 'GESTOR';
    }
    return 'GESTOR';
  }
  if (seg === 'engenheiro') {
    return r === 'GESTOR_OBRA' ? 'GESTOR_OBRA' : 'ENGENHEIRO';
  }

  if (r === 'ADMIN') {
    const explicit = getPanelFromPath(path);
    if (explicit) return explicit;

    const preview = ctx?.adminPreview;
    const fromAdmin = ctx?.fromAdmin === true;
    if (preview && !fromAdmin && SHARED_SEGMENTS.has(seg)) {
      return preview;
    }

    if (SHARED_SEGMENTS.has(seg) || isRootDashboard(seg)) return 'ADMIN';
    if (CONSTRUTOR_PANEL_SEGMENTS.has(seg)) return 'CONSTRUTOR';
    return 'ADMIN';
  }

  if (r === 'GESTOR') {
    return 'GESTOR';
  }

  if (r === 'COMERCIAL' || r === 'PARCEIRO') {
    return r === 'PARCEIRO' ? 'PARCEIRO' : 'COMERCIAL';
  }

  if (r === 'ENGENHEIRO' || r === 'GESTOR_OBRA') {
    return r;
  }

  if (CONSTRUTOR_PANEL_SEGMENTS.has(seg) || seg === 'obras') {
    return r === 'TOMADOR' ? 'TOMADOR' : 'CONSTRUTOR';
  }

  return r;
}

/** Admin está visualizando outro painel de propósito (preview) */
export function isAdminPreviewingPanel(
  role: AppRole | null,
  path: string,
  ctx?: NavContext,
): boolean {
  return role === 'ADMIN' && getNavRole(role, path, ctx) !== 'ADMIN';
}

/** Home do painel ativo na sidebar */
export function getPanelHome(role: AppRole | null, path?: string, ctx?: NavContext): string {
  if (!role) return '/dashboard';
  const navRole = path ? getNavRole(role, path, ctx) : normalizeRole(role) ?? role;
  if (!navRole) return '/dashboard';
  return ROLE_HOME[navRole] ?? '/dashboard';
}

/** Lista de obras — destino do breadcrumb "voltar" por perfil */
export function getObrasListPath(role: string | null | undefined): string {
  const r = normalizeRole(role);
  switch (r) {
    case 'ADMIN':
      return '/dashboard/admin/obras';
    case 'GESTOR':
      return '/dashboard/gestor/etapas';
    case 'ENGENHEIRO':
    case 'GESTOR_OBRA':
      return '/dashboard/obras';
    case 'CONSTRUTOR':
    case 'TOMADOR':
    default:
      return '/dashboard/obras';
  }
}

export function getObrasListLabel(role: string | null | undefined): string {
  const r = normalizeRole(role);
  if (r === 'ADMIN') return 'Obras — Admin';
  if (r === 'GESTOR') return 'Etapas pendentes';
  if (r === 'ENGENHEIRO' || r === 'GESTOR_OBRA') return 'Minhas Obras';
  return 'Minhas Obras';
}

/** Breadcrumbs para detalhe de obra */
export function getObraDetailBreadcrumbs(
  role: string | null | undefined,
  obraNome: string,
): BreadcrumbItem[] {
  const r = normalizeRole(role);
  const items: BreadcrumbItem[] = [];

  if (r === 'ADMIN') {
    items.push({ label: 'Admin', href: '/dashboard/admin' });
    items.push({ label: 'Obras', href: '/dashboard/admin/obras' });
  } else if (r === 'GESTOR') {
    items.push({ label: 'Painel do Fundo', href: '/dashboard/gestor' });
    items.push({ label: 'Etapas', href: getObrasListPath(role) });
  } else {
    items.push({ label: getObrasListLabel(role), href: getObrasListPath(role) });
  }

  items.push({ label: obraNome });
  return items;
}

/** Passos SIPOC — fluxo operacional (fonte única para guias de painel) */
export const SIPOC_OBRAS_FLOW = [
  { step: 0, label: 'Viabilidade', actor: 'Incorporador', desc: 'Dossiê de crédito: checklist + Ficha do Empreendimento' },
  { step: 1, label: 'Cadastro', actor: 'Cliente', desc: 'Obra criada com documentos e etapas' },
  { step: 2, label: 'Homologação', actor: 'Admin IMOBI', desc: 'Validação e entrada no pipe ativo' },
  { step: 3, label: 'Vistoria', actor: 'Engenheiro', desc: 'Aprovação técnica por etapa' },
  { step: 4, label: 'Comitê', actor: 'Gestor do Fundo', desc: 'Acompanhamento e decisão de crédito (somente leitura)' },
  { step: 5, label: 'Pagamento', actor: 'Admin IMOBI', desc: 'Transferência manual e confirmação' },
] as const;

/** @deprecated use SIPOC_OBRAS_FLOW */
export const ADMIN_OBRAS_FLOW = SIPOC_OBRAS_FLOW;
