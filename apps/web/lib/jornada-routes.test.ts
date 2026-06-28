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
assert.equal(isJornadaPathAllowed('/dashboard/simulador', tomadorKyc), false);
assert.equal(isJornadaPathAllowed('/dashboard/construtor', tomadorKyc), false);
assert.equal(isJornadaPathAllowed('/dashboard/perfil', tomadorKyc), true);
assert.equal(isJornadaPathAllowed('/dashboard/score', tomadorKyc), false);

const tomadorViabilidade = j({
  perfil: 'tomador',
  passoAtual: 'viabilidade',
  href: '/dashboard/proposta-credito',
});
assert.equal(isJornadaPathAllowed('/dashboard/proposta-credito', tomadorViabilidade), true);
assert.equal(isJornadaPathAllowed('/dashboard/viabilidade', tomadorViabilidade), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras', tomadorViabilidade), false);

const tomadorObra = j({
  perfil: 'tomador',
  passoAtual: 'obra',
  href: '/dashboard/obras/nova',
});
assert.equal(isJornadaPathAllowed('/dashboard/obras/nova', tomadorObra), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras/abc', tomadorObra), true);

const tomadorConcluido = j({
  perfil: 'tomador',
  passoAtual: 'concluido',
  href: '/dashboard/construtor',
});
assert.equal(isJornadaPathAllowed('/dashboard/construtor', tomadorConcluido), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras/nova', tomadorConcluido), true);

const gestorOk = j({
  perfil: 'gestor',
  passoAtual: 'gestor_ok',
  href: '/dashboard/gestor',
});
assert.equal(isJornadaPathAllowed('/dashboard/gestor', gestorOk), true);
assert.equal(isJornadaPathAllowed('/dashboard/gestor/kyc', gestorOk), true);
assert.equal(isJornadaPathAllowed('/dashboard/gestor/etapas', gestorOk), true);
assert.equal(isJornadaPathAllowed('/dashboard/obras/x', gestorOk), false);
assert.equal(isJornadaHubPath('/dashboard/gestor', gestorOk), true);
assert.equal(isJornadaHubPath('/dashboard/gestor/etapas', gestorOk), false);

console.log('✅ jornada-routes OK');
