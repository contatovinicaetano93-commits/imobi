# Análise de crédito / viabilidade de obra — documentação IMOBI

Processo **offline hoje** (PDF + Excel por e-mail). Esta pasta consolida os templates oficiais e a especificação para o futuro fluxo guiado na plataforma.

## Arquivos de referência (templates)

| Arquivo | Uso |
|---------|-----|
| [`templates/Empreendimento - Novo.pdf`](templates/Empreendimento%20-%20Novo.pdf) | Checklist de documentos — **obra nova** (pré-obra / lançamento) |
| [`templates/Empreendimento - Em Andamento.pdf`](templates/Empreendimento%20-%20Em%20Andamento.pdf) | Checklist de documentos — **obra em andamento** |
| [`templates/Empreendimento - CREDITO PONTE.pdf`](templates/Empreendimento%20-%20CREDITO%20PONTE.pdf) | Checklist de documentos — **crédito ponte** (andamento + legalidade e garantias) |
| [`templates/Ficha do Empreendimento e Viabilidade IMOBI.xlsx`](templates/Ficha%20do%20Empreendimento%20e%20Viabilidade%20IMOBI.xlsx) | Planilha estruturada (EVEF + unidades + carteira + portfólio do grupo) |

## Documentação principal

- **[`ANALISE_CREDITO_DOCUMENTOS.md`](ANALISE_CREDITO_DOCUMENTOS.md)** — análise completa, diferenças novo vs andamento, estágios de entrada, mapeamento Excel ↔ checklist e notas para produto.
- **[`checklist-por-estagio.json`](checklist-por-estagio.json)** — checklist estruturado (fonte para wizard / validação futura).

## Relação com o código hoje

| Área | Caminho | Observação |
|------|---------|------------|
| Wizard Due Diligence (gestor) | `apps/web/app/(dashboard)/dashboard/gestor/due-diligence/nova/` | Parcialmente alinhado à Ficha; não cobre todos os PDFs nem estágio da obra |
| API Due Diligence | `services/api/src/modules/due-diligence/` | Persiste payload JSON; sem checklist por estágio |
| Jornada tomador | `services/api/src/modules/jornada/` | KYC → obra → crédito (pós-cadastro na plataforma) |

## Próximo passo (produto)

Fluxo guiado na plataforma: **selecionar estágio da obra** → checklist dinâmico (novo / andamento / % físico) → upload ou preenchimento da Ficha → envio para análise Admin.
