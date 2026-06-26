import assert from 'node:assert/strict';
import type { Jornada } from '@/lib/api';
import { isJornadaPathAllowed, isJornadaHubPath } from './jornada-routes';

function j(partial: Partial<Jornada> & Pick<Jornada, 'perfil' | 'passoAtual' | 'href'>): Jornada {
  return {
    titulo: 't',
    descricao: 'd',
    concluido: false,
    passosConcluidos: 0,
    totalPassos: 5,
    progressoPct: 0,
    ...partial,
  };
}

const tomadorKyc = j({
  perfil: 'tomador',
  passoAtual: 'kyc',
  href: '/dashboard/kyc',
});
assert.equal(isJornadaPathAllowed('/dashboard/kyc', tomadorKyc), true);
assert.equal(isJornadaPathAllowed('/dashboard/simulador', tomadorKyc), true);
assert.equal(isJornadaPathAllowed('/dashboard/construtor', tomadorKyc), true);
assert.equal(isJornadaPathAllowed('/dashboard/perfil', tomadorKyc), true);
assert.equal(isJornadaPathAllowed('/dashboard/score', tomadorKyc), false);

const tomadorViabilidade = j({
  perfil: 'tomador',
  passoAtual: 'viabilidade',
  href: '/dashboard/viabilidade',
});
assert.equal(isJornadaPathAllowed('/dashboard/viabilidade', tomadorViabilidade), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras', tomadorViabilidade), true);

const tomadorObra = j({
  perfil: 'tomador',
  passoAtual: 'obra',
  href: '/dashboard/obras/nova',
});
assert.equal(isJornadaPathAllowed('/dashboard/obras/nova', tomadorObra), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras/abc', tomadorObra), true);

const gestorEtapas = j({
  perfil: 'gestor',
  passoAtual: 'gestor_etapas',
  href: '/dashboard/gestor/etapas',
});
assert.equal(isJornadaPathAllowed('/dashboard/gestor/etapas', gestorEtapas), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras/x/vistoria/y', gestorEtapas), true);

const gestorOk = j({
  perfil: 'gestor',
  passoAtual: 'gestor_ok',
  href: '/dashboard/gestor',
});
assert.equal(isJornadaHubPath('/dashboard/gestor', gestorOk), true);
assert.equal(isJornadaHubPath('/dashboard/gestor/etapas', gestorOk), false);

console.log('✅ jornada-routes OK');
