import assert from 'node:assert/strict';
import type { Jornada } from '@/lib/api';
import { getPassoIndex, getPassoNumero, getStepsForJornada, TOMADOR_STEPS, GESTOR_STEPS } from './jornada-steps';

function jornada(partial: Partial<Jornada> & Pick<Jornada, 'perfil' | 'passoAtual'>): Jornada {
  return {
    titulo: 't',
    descricao: 'd',
    href: '/dashboard',
    concluido: false,
    passosConcluidos: 0,
    totalPassos: 5,
    progressoPct: 0,
    ...partial,
  };
}

assert.equal(TOMADOR_STEPS.length, 6);
assert.equal(GESTOR_STEPS.length, 1);

const tomadorKyc = jornada({ perfil: 'tomador', passoAtual: 'kyc' });
assert.equal(getPassoNumero(tomadorKyc), 1);
assert.equal(getPassoIndex(tomadorKyc), 0);

const tomadorObra = jornada({ perfil: 'tomador', passoAtual: 'obra' });
assert.equal(getPassoNumero(tomadorObra), 3);

const gestorEtapas = jornada({ perfil: 'gestor', passoAtual: 'gestor_ok' });
assert.equal(getStepsForJornada(gestorEtapas).length, 1);
assert.equal(getPassoNumero(gestorEtapas), 1);

console.log('✅ jornada-steps OK');
