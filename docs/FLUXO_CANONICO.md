# Fluxo canônico — Imobi

**Modo lançamento:** jornada guiada (`NEXT_PUBLIC_GUIDED_STRICT=true`, default) + nav mínima por perfil (`lib/canonical-flow.ts`).

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API | https://imobi-api-staging.onrender.com |

## Funil operacional (único)

```
/envie-seu-projeto → PropostaCredito
       ↓
Login + KYC
       ↓
Dossiê / viabilidade (tomador)
       ↓
Admin aprova dossiê
       ↓
Tomador cadastra obra
       ↓
Admin homologa obra → EM_EXECUCAO
       ↓
Tomador solicita crédito / comitê
       ↓
Admin abre comitê → Engenheiro parecer + voto
       ↓
Comitê APROVADO → Crédito ATIVO
       ↓
Tomador: evidências GPS + submete etapa
       ↓
Engenheiro aprova vistoria
       ↓
LiberacaoParcela AGUARDANDO_PAGAMENTO
       ↓
Admin confirma pagamento (SIPOC)
       ↓
100% etapas + valor pago → Crédito QUITADO + obra CONCLUIDA
```

**Jornada:** `GET /jornada` + `JornadaGuard` (redirect estrito por passo).

## Tomador / Construtor

| # | Passo | Rota |
|---|-------|------|
| 1 | KYC | `/dashboard/kyc` |
| 2 | Viabilidade | `/dashboard/proposta-credito` |
| 3 | Obra | `/dashboard/obras/nova` |
| 4 | Crédito | `/dashboard/credito/solicitar` |
| 5 | Aguardando comitê | `/dashboard/construtor` |
| 6 | Liberações | `/dashboard/credito` + `/dashboard/obras` |
| 7 | Quitado | `/dashboard/construtor` |

**Hub:** `/dashboard/construtor` · **Nav:** jornada, KYC, viabilidade, obras, crédito

## Gestor do fundo (somente KPIs + DRE — sem operação)

| Indicador | Rota |
|-----------|------|
| Painel + DRE operacional | `/dashboard/gestor` |
| KPI · KYC (leitura) | `/dashboard/gestor/kyc` |
| KPI · Etapas (leitura) | `/dashboard/gestor/etapas` |

**API:** `GET /api/v1/manager/dashboard` → KPIs + objeto `dre` (carteira, desembolso, pipe, saúde).

Comitê, KYC operacional, due diligence e liberações são **internos** (Admin / Engenheiro). O gestor **não participa** desses processos e **não acessa** rotas do tomador.

## Engenheiro

| Passo | Rota | Ação |
|-------|------|------|
| Vistorias (hub) | `/dashboard/engenheiro/vistoria` | Fila SIPOC — aprovar/reprovar etapas |
| Obras · evidências | `/dashboard/obras` | Somente leitura + atalho para vistoria |
| Parecer comitê | `/dashboard/engenheiro/comite` | Parecer técnico antes da votação admin |

**Não cadastra obra** — cadastro é do tomador; homologação é do Admin (SIPOC passo 2).

## Comercial / Parceiro

| Passo | Rota |
|-------|------|
| Painel (indicações, comissões) | `/dashboard/comercial` |
| Leads | `/dashboard/comercial/leads` |
| Ranking | `/dashboard/comercial/ranking` |

## Admin — centro de comando

| Fila | Rota |
|------|------|
| Hub + SIPOC | `/dashboard/admin` |
| Pipeline comercial | `/dashboard/admin/pipeline` |
| Propostas | `/dashboard/admin/propostas` |
| KYC | `/dashboard/admin/kyc` |
| Viabilidade | `/dashboard/admin/viabilidade` |
| Obras / homologação | `/dashboard/admin/obras` |
| Vistorias | `/dashboard/admin/vistorias` |
| Comitê | `/dashboard/admin/comite` |
| Usuários | `/dashboard/admin/usuarios` |

## Rotas legadas (redirect automático)

Bookmarks antigos redirecionam via `LEGACY_PREFIX_REDIRECTS` em `canonical-flow.ts`:

| Legado | Destino |
|--------|---------|
| `/dashboard/simulador`, `/dashboard/viabilidade` | `/dashboard/proposta-credito` |
| `/dashboard/score` | `/dashboard/construtor` |
| `/dashboard/comite` | `/dashboard/credito/solicitar` |
| `/dashboard/fundos`, `/dashboard/gestor/carteira` | `/dashboard/gestor` |
| `/dashboard/relatorios` | `/dashboard/admin` |
| `/dashboard/gestor/comite`, `/dashboard/gestor/due-diligence` | `/dashboard/gestor` |
| `/dashboard/engenheiro/checklist`, `alertas` | `/dashboard/engenheiro/vistoria` |

## Técnico

- **API first:** contratos em OpenAPI + `@imbobi/schemas` (Zod)
- **Resiliência:** throttle + cache (manager dashboard 60s), retry em jobs BullMQ
- **Escalável:** cache Redis, queries agregadas no `ManagerService`
- **Guiado:** `GUIDED_STRICT_MODE` + `isCanonicalRouteAllowed`
- **Beta legado:** `NEXT_PUBLIC_BETA_MVP_MODE=true` (não usar em produção)
