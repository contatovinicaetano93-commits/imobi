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
  fundo: [{ href: '/dashboard/fundo' }],
  cliente: [
    { href: '/dashboard/cliente' },
    { href: '/dashboard/cliente/obra' },
    { href: '/dashboard/cliente/documentos' },
  ],
  engenheiro: [
    { href: '/dashboard/engenheiro' },
    { href: '/dashboard/engenheiro/vistoria' },
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

expectNavRole('ADMIN', '/dashboard/fundo', 'FUNDO');
expectNavRole('FUNDO', '/dashboard/fundo', 'FUNDO');
expectNavRole('CLIENTE', '/dashboard/cliente/documentos', 'CLIENTE');
expectNavRole('ADMIN', '/dashboard/admin/usuarios', 'ADMIN');

expectActive('ADMIN', '/dashboard/admin/usuarios', NAV.admin, '/dashboard/admin/usuarios');
expectActive('FUNDO', '/dashboard/fundo', NAV.fundo, '/dashboard/fundo');
expectActive('CLIENTE', '/dashboard/cliente/obra/nova', NAV.cliente, '/dashboard/cliente/obra');
expectActive('ENGENHEIRO', '/dashboard/engenheiro/vistoria', NAV.engenheiro, '/dashboard/engenheiro/vistoria');

console.log('✅ panel-navigation OK');
