export const TOMADOR = {
  email: process.env.E2E_TOMADOR_EMAIL ?? 'construtora1@test.com',
  password: process.env.E2E_TOMADOR_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/tomador.json',
};

export const GESTOR = {
  email: process.env.E2E_GESTOR_EMAIL ?? 'admin1@test.com',
  password: process.env.E2E_GESTOR_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/gestor.json',
};

export const ENGENHEIRO = {
  email: process.env.E2E_ENGENHEIRO_EMAIL ?? 'eng1@test.com',
  password: process.env.E2E_ENGENHEIRO_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/engenheiro.json',
};
