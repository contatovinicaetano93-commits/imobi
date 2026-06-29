/**
 * Valida getNavRole / getActiveNavHref — regressão de sidebar por perfil.
 */
import assert from 'node:assert/strict';
import { getNavRole, getActiveNavHref } from './panel-navigation';

const NAV = {
  admin: [
    { href: '/dashboard/admin' },
    { href: '/dashboard/admin/usuarios' },
  ],
  gestor: [{ href: '/dashboard/gestor' }],
  tomador: [
    { href: '/dashboard/construtor' },
    { href: '/dashboard/obras' },
    { href: '/dashboard/kyc' },
    { href: '/dashboard/credito' },
  ],
  engenheiro: [
    { href: '/dashboard/engenheiro/vistoria' },
    { href: '/dashboard/engenheiro/comite' },
  ],
};

function expectNavRole(
  role: Parameters<typeof getNavRole>[0],
  path: string,
  expected: string,
  ctx?: Parameters<typeof getNavRole>[2],
) {
  const got = getNavRole(role, path, ctx);
  assert.equal(got, expected, `${role} @ ${path} → ${got}, esperado ${expected}`);
}

function expectActive(
  role: Parameters<typeof getNavRole>[0],
  path: string,
  items: { href: string }[],
  expected: string,
  ctx?: Parameters<typeof getNavRole>[2],
) {
  const navRole = getNavRole(role, path, ctx);
  const got = getActiveNavHref(path, navRole, items);
  assert.equal(got, expected, `active ${role} @ ${path} → ${got}, esperado ${expected}`);
}

expectNavRole('ADMIN', '/dashboard/gestor', 'GESTOR');
expectNavRole('GESTOR', '/dashboard/gestor/kyc/1', 'GESTOR');
expectNavRole('TOMADOR', '/dashboard/credito/solicitar', 'TOMADOR');
expectNavRole('ADMIN', '/dashboard/gestor/kyc', 'GESTOR');
expectNavRole('ADMIN', '/dashboard/admin/kyc/abc', 'ADMIN');

expectActive('ADMIN', '/dashboard/admin/kyc/abc', NAV.admin, '/dashboard/admin');
expectActive('ADMIN', '/dashboard/admin/pagamentos', NAV.admin, '/dashboard/admin');
expectActive('ADMIN', '/dashboard/admin/usuarios', NAV.admin, '/dashboard/admin/usuarios');
expectActive('GESTOR', '/dashboard/gestor/kyc/1', NAV.gestor, '/dashboard/gestor');
expectActive('TOMADOR', '/dashboard/obras/xyz', NAV.tomador, '/dashboard/obras');
expectActive('ENGENHEIRO', '/dashboard/engenheiro/vistoria', NAV.engenheiro, '/dashboard/engenheiro/vistoria');

console.log('✅ panel-navigation OK');
