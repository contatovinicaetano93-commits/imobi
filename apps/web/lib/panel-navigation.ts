/**
 * Navegação guiada por painel — fonte única para sidebar, breadcrumbs e retorno.
 * Evita que ADMIN (e outros perfis) "se percam" ao acessar rotas compartilhadas.
 */

import { normalizeRole, ROLE_HOME, type AppRole } from '@/lib/role-permissions';

/** Segmentos que pertencem ao painel Construtor/Tomador */
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

export type PanelId = AppRole;

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/** Segmento principal após /dashboard */
export function getDashboardSegment(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[1] ?? '';
}

/**
 * Define qual menu lateral exibir.
 * ADMIN permanece no menu Admin em rotas compartilhadas (obras, fundos, relatórios).
 */
export function getNavRole(role: AppRole | null, path: string): AppRole | null {
  if (!role) return null;

  const seg = getDashboardSegment(path);

  if (seg === 'admin') return 'ADMIN';
  if (seg === 'comercial') return 'COMERCIAL';
  if (seg === 'gestor') return 'GESTOR';
  if (seg === 'engenheiro') {
    return role === 'GESTOR_OBRA' ? 'GESTOR_OBRA' : 'ENGENHEIRO';
  }

  if (role === 'ADMIN') {
    if (SHARED_SEGMENTS.has(seg) || seg === '' || seg === 'dashboard') return 'ADMIN';
    if (CONSTRUTOR_PANEL_SEGMENTS.has(seg)) return 'CONSTRUTOR';
    if (seg === 'engenheiro') return 'ENGENHEIRO';
    if (seg === 'comercial') return 'COMERCIAL';
    if (seg === 'gestor') return 'GESTOR';
    return 'ADMIN';
  }

  if (role === 'GESTOR' && (SHARED_SEGMENTS.has(seg) || seg === '')) {
    return 'GESTOR';
  }

  if (CONSTRUTOR_PANEL_SEGMENTS.has(seg) || seg === 'obras') {
    if (role === 'ENGENHEIRO' || role === 'GESTOR_OBRA') return role;
    return role === 'TOMADOR' ? 'TOMADOR' : 'CONSTRUTOR';
  }

  return role;
}

/** Admin está visualizando outro painel de propósito (preview) */
export function isAdminPreviewingPanel(role: AppRole | null, path: string): boolean {
  return role === 'ADMIN' && getNavRole(role, path) !== 'ADMIN';
}

/** Home do painel ativo na sidebar */
export function getPanelHome(role: AppRole | null, path?: string): string {
  if (!role) return '/dashboard';
  const navRole = path ? getNavRole(role, path) : role;
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
      return '/dashboard/gestor';
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
    items.push({ label: 'Obras', href: getObrasListPath(role) });
  } else {
    items.push({ label: getObrasListLabel(role), href: getObrasListPath(role) });
  }

  items.push({ label: obraNome });
  return items;
}

/** Passos do fluxo SIPOC para orientação do Admin */
export const ADMIN_OBRAS_FLOW = [
  { step: 1, label: 'Cadastro', actor: 'Construtor', desc: 'Obra criada com documentos e etapas' },
  { step: 2, label: 'Homologação', actor: 'Admin IMOBI', desc: 'Validação e entrada no pipe ativo' },
  { step: 3, label: 'Vistoria', actor: 'Engenheiro', desc: 'Aprovação técnica por etapa' },
  { step: 4, label: 'Liberação', actor: 'Gestor do Fundo', desc: 'Comitê e liberação de crédito' },
  { step: 5, label: 'Pagamento', actor: 'Admin IMOBI', desc: 'Transferência manual e confirmação' },
] as const;
