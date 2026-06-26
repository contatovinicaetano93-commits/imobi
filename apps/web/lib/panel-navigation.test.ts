/**
 * Valida getNavRole / getActiveNavHref — regressão de sidebar por perfil.
 */
import assert from 'node:assert/strict';
import { getNavRole, getActiveNavHref } from './panel-navigation';

const NAV = {
  admin: [
    { href: '/dashboard/admin' },
    { href: '/dashboard/admin/obras' },
    { href: '/dashboard/admin/kyc' },
    { href: '/dashboard/admin/vistorias' },
    { href: '/dashboard/admin/comite' },
    { href: '/dashboard/fundos' },
  ],
  gestor: [
    { href: '/dashboard/gestor' },
    { href: '/dashboard/gestor/kyc' },
    { href: '/dashboard/gestor/etapas' },
    { href: '/dashboard/fundos' },
  ],
  tomador: [
    { href: '/dashboard/construtor' },
    { href: '/dashboard/obras' },
    { href: '/dashboard/kyc' },
    { href: '/dashboard/credito' },
  ],
  engenheiro: [
    { href: '/dashboard/engenheiro' },
    { href: '/dashboard/obras' },
    { href: '/dashboard/engenheiro/vistoria' },
  ],
  comercial: [
    { href: '/dashboard/comercial' },
    { href: '/dashboard/comercial/leads' },
  ],
};

function expectNavRole(
  role: Parameters<typeof getNavRole>[0],
  path: string,
  expected: string,
) {
  const got = getNavRole(role, path);
  assert.equal(got, expected, `${role} @ ${path} → ${got}, esperado ${expected}`);
}

function expectActive(
  role: Parameters<typeof getNavRole>[0],
  path: string,
  items: { href: string }[],
  expected: string,
) {
  const navRole = getNavRole(role, path);
  const got = getActiveNavHref(path, navRole, items);
  assert.equal(got, expected, `active ${role} @ ${path} → ${got}, esperado ${expected}`);
}

expectNavRole('ADMIN', '/dashboard/fundos', 'ADMIN');
expectNavRole('ADMIN', '/dashboard/obras/abc', 'ADMIN');
expectNavRole('GESTOR', '/dashboard/obras/abc', 'GESTOR');
expectNavRole('GESTOR', '/dashboard/fundos', 'GESTOR');
expectNavRole('GESTOR', '/dashboard/comite', 'GESTOR');
expectNavRole('ENGENHEIRO', '/dashboard/comite', 'ENGENHEIRO');
expectNavRole('COMERCIAL', '/dashboard/simulador', 'COMERCIAL');
expectNavRole('TOMADOR', '/dashboard/credito/solicitar', 'TOMADOR');
expectNavRole('ADMIN', '/dashboard/construtor', 'CONSTRUTOR');

expectActive('ADMIN', '/dashboard/admin/comite', NAV.admin, '/dashboard/admin/comite');
expectActive('ADMIN', '/dashboard/admin/kyc/abc', NAV.admin, '/dashboard/admin/kyc');
expectActive('ADMIN', '/dashboard/admin/vistorias', NAV.admin, '/dashboard/admin/vistorias');
expectActive('ADMIN', '/dashboard/obras/xyz', NAV.admin, '/dashboard/admin/obras');
expectActive('GESTOR', '/dashboard/gestor/kyc/1', NAV.gestor, '/dashboard/gestor/kyc');
expectActive('GESTOR', '/dashboard/obras/xyz', NAV.gestor, '/dashboard/gestor/etapas');
expectActive('TOMADOR', '/dashboard/obras/xyz', NAV.tomador, '/dashboard/obras');
expectActive('TOMADOR', '/dashboard/credito/solicitar', NAV.tomador, '/dashboard/credito');
expectActive('ENGENHEIRO', '/dashboard/obras/xyz/vistoria/1', NAV.engenheiro, '/dashboard/obras');

console.log('✅ panel-navigation OK');
