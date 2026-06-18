export const TOMADOR = {
  email: process.env.E2E_TOMADOR_EMAIL ?? 'tomador@test.com',
  password: process.env.E2E_TOMADOR_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/tomador.json',
};

export const GESTOR = {
  email: process.env.E2E_GESTOR_EMAIL ?? 'fundo@test.com',
  password: process.env.E2E_GESTOR_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/gestor.json',
};

export const ENGENHEIRO = {
  email: process.env.E2E_ENGENHEIRO_EMAIL ?? 'engenheiro@test.com',
  password: process.env.E2E_ENGENHEIRO_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/engenheiro.json',
};

export const COMERCIAL = {
  email: process.env.E2E_COMERCIAL_EMAIL ?? 'comercial@test.com',
  password: process.env.E2E_COMERCIAL_PASSWORD ?? 'TestPassword123',
  storageState: '.auth/comercial.json',
};
