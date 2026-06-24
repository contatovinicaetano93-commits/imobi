export const MOCK_CHECKLIST_TEMPLATE = {
  estagio: 'NOVO',
  meta: {
    id: 'NOVO',
    label: 'Empreendimento novo (pré-obra ou lançamento)',
    descricao: 'Obra ainda não iniciada ou em fase inicial de projeto/licenciamento.',
  },
  itens: [
    {
      itemId: '1',
      titulo: 'Matrícula do imóvel (máx. 30 dias)',
      obrigatorio: true,
    },
    {
      itemId: '2',
      titulo: 'Certidão negativa de ônus, alienações e gravames',
      obrigatorio: true,
    },
  ],
  estagiosDisponiveis: [
    {
      id: 'NOVO',
      label: 'Empreendimento novo',
      descricao: 'Obra ainda não iniciada.',
    },
    {
      id: 'EM_ANDAMENTO',
      label: 'Obra em andamento',
      descricao: 'Obra já iniciada.',
    },
    {
      id: 'ENTRADA_TARDIA',
      label: 'Entrada em etapa avançada',
      descricao: 'Crédito com obra avançada.',
    },
  ],
};

export const MOCK_DOSSIE_RASCUNHO = {
  id: 'e2e-dossie-1',
  nomeEmpreendimento: 'Residencial Parque E2E',
  estagioObra: 'NOVO',
  status: 'RASCUNHO',
  percentualFisico: 0,
  dataBase: '2026-06-01T00:00:00.000Z',
  obraId: null,
  criadoEm: '2026-06-01T10:00:00.000Z',
  atualizadoEm: '2026-06-01T10:00:00.000Z',
  enviadoEm: null,
  checklistItens: [
    {
      id: 'ci-1',
      itemId: '1',
      titulo: 'Matrícula do imóvel (máx. 30 dias)',
      obrigatorio: true,
      status: 'PENDENTE',
      documentoId: null,
      observacao: null,
    },
    {
      id: 'ci-2',
      itemId: '2',
      titulo: 'Certidão negativa de ônus, alienações e gravames',
      obrigatorio: true,
      status: 'PENDENTE',
      documentoId: null,
      observacao: null,
    },
  ],
};

export const MOCK_DOSSIE_LIST = [
  {
    id: MOCK_DOSSIE_RASCUNHO.id,
    nomeEmpreendimento: MOCK_DOSSIE_RASCUNHO.nomeEmpreendimento,
    estagioObra: 'NOVO',
    status: 'RASCUNHO',
    percentualFisico: 0,
    dataBase: MOCK_DOSSIE_RASCUNHO.dataBase,
    obraId: null,
    criadoEm: MOCK_DOSSIE_RASCUNHO.criadoEm,
    atualizadoEm: MOCK_DOSSIE_RASCUNHO.atualizadoEm,
    enviadoEm: null,
  },
];
