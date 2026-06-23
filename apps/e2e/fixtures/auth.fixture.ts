export const TOMADOR = {
  email: process.env.E2E_TOMADOR_EMAIL ?? 'tomador@imobi.com.br',
  password: process.env.E2E_TOMADOR_PASSWORD ?? 'Tomador@123',
  storageState: '.auth/tomador.json',
};

export const GESTOR = {
  email: process.env.E2E_GESTOR_EMAIL ?? 'gestor@imobi.com.br',
  password: process.env.E2E_GESTOR_PASSWORD ?? 'Gestor@123',
  storageState: '.auth/gestor.json',
};

export const ENGENHEIRO = {
  email: process.env.E2E_ENGENHEIRO_EMAIL ?? 'eng@imobi.com.br',
  password: process.env.E2E_ENGENHEIRO_PASSWORD ?? 'Eng@123',
  storageState: '.auth/engenheiro.json',
};
