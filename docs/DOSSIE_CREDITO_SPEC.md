# Dossiê de Crédito — Especificação Funcional

> Digitalização do processo de coleta de documentos para análise de crédito de obra,
> substituindo a planilha "Ficha do Empreendimento e Viabilidade" por um fluxo guiado
> (wizard) dentro do imobi.

## Objetivo

Transformar a coleta burocrática de documentos (planilhas + PDFs por e-mail) em um
fluxo guiado de 7 passos, com dados estruturados, validação imediata (Zod) e trilha
de auditoria. Os dados estruturados alimentam o painel do analista com métricas
calculadas automaticamente (VGV, % vendido, inadimplência da carteira, exposição a
permuta, avanço físico × financeiro).

## Naturezas de dados

| Natureza | Itens | Tratamento |
|---|---|---|
| Dado estruturado | Ficha do Empreendimento, Tabela de Unidades, Carteira de Recebíveis, Distratos, Cronograma | Formulário guiado + importação XLSX/CSV validada |
| Documento-anexo | Demonstrações Financeiras (3 exercícios), Apresentações, Organograma societário | Upload S3 com checklist |
| Pergunta qualitativa | Acordo de não-concorrência das permutas | Pergunta condicional + upload do acordo |

## Wizard — 7 passos

1. **Empreendimento e SPE** — dados cadastrais da SPE, localização, tipo,
   patrimônio de afetação, áreas, datas (lançamento, início/término de obras,
   habite-se), alienação fiduciária, seguro de obra, % entrada/obras/chaves,
   orçamento e cronograma. Campos derivados (VGV, valor médio do m², % vendas)
   **não são digitados** — são calculados a partir das unidades.
2. **Unidades** — grid editável para poucos registros + importação XLSX/CSV com
   template para volumes grandes. Validação linha a linha com erro apontando a linha.
3. **Permutas (condicional)** — só aparece se houver unidades com status PERMUTA.
   Pergunta: existe acordo impedindo as permutadas de concorrer com o estoque?
   Sim → upload do acordo. Não → flag de risco no dossiê.
4. **Carteira de Recebíveis** — importação com template (contrato, unidade, cliente,
   parcela atual/total, vencimento × pagamento, valores, Price/SAC/SACOC).
   Sistema calcula inadimplência, atraso médio e curva de recebíveis.
5. **Cronograma físico-financeiro** — baseline declarado, conciliável depois com o
   avanço real medido via `EtapaObra`/`EvidenciaEtapa` (GPS-validado).
6. **Empresa e grupo** — controladora, DFs dos 3 últimos exercícios (3 slots
   obrigatórios nomeados por ano), organograma, apresentações. Distratos opcionais.
7. **Revisão e envio** — checklist de completude, declaração de veracidade, submit.
   Status muda para EM_ANALISE e trava edição.

## Ciclo de vida

```
RASCUNHO → EM_ANALISE → PENDENCIA → EM_ANALISE → APROVADO | REPROVADO
```

- Em PENDENCIA o analista marca itens específicos; o incorporador corrige só aquilo.
- Toda transição de status gera registro em `DossieAuditLog`.
- Após submissão, alterações só via novo ciclo de pendência (trilha de auditoria).

## Arquitetura

- **Schemas Zod** (`@imbobi/schemas` → `dossie.schema.ts`): fonte de verdade da
  validação, compartilhada entre web, mobile e API (CLAUDE.md regra 4).
- **Prisma** (`services/api/prisma/schema.prisma`): agregado `DossieCredito` ligado
  opcionalmente ao `Credito` existente, com filhos para unidades, recebíveis,
  distratos e documentos.
- **API** (`services/api/src/modules/dossie`): CRUD por passo do wizard, importação
  XLSX/CSV, submissão, fluxo de pendências, métricas derivadas.
- **Web** (`apps/web/app/(dashboard)/dossies`): wizard multi-step com salvamento de
  rascunho por passo.
- **Storage**: uploads via módulo `storage` existente (S3).

## Origem (planilha analisada)

Abas da planilha original mapeadas: Ficha do Empreendimento (≈35 campos),
Tabela de Unidades (status vendida/permuta/estoque, m², valores, amortização),
Parcelas dos Clientes, Distratos, Obras em Andamento (Grupo), Obras Concluídas
(Grupo) e Landbank (Grupo). As três últimas (grupo) ficam para uma fase 2 — são
o ponto de maior atrito do preenchimento e têm menor valor analítico imediato.

## Fora de escopo (fase 1)

- Abas de grupo (Obras em Andamento/Concluídas, Landbank)
- Score automático de crédito a partir do dossiê
- Integração mobile (wizard é web-first; mobile consome leitura)
