# Fluxo canônico — Imobi

**Modo lançamento:** jornada guiada (`NEXT_PUBLIC_GUIDED_STRICT=true`, default) + nav mínima por perfil (`lib/canonical-flow.ts`).

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API | https://imobi-api-staging.onrender.com |

## Funil

```
/envie-seu-projeto → PropostaCredito
       ↓
Login (mesmo e-mail) → dossiê + jornada
       ↓
GET /jornada → passo atual (redirect estrito)
```

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

## Gestor (somente KPIs — sem aprovação)

| Indicador | Rota |
|-----------|------|
| Painel | `/dashboard/gestor` |
| KPI · KYC | `/dashboard/gestor/kyc` |
| KPI · Etapas | `/dashboard/gestor/etapas` |

Comitê, KYC operacional e liberações são **internos** (Admin / Engenheiro). O gestor **não participa** desses processos e **não acessa** rotas do tomador (`/dashboard/obras`, `/dashboard/credito`, etc.).

## Tomador vs Gestor (copy)

| Perfil | O que faz | O que vê |
|--------|-----------|----------|
| **Tomador** | Jornada guiada: KYC → viabilidade → obra → crédito → acompanhar | Análises feitas pelo **time IMOBI** |
| **Gestor** | Nada operacional — só números | KPIs agregados, drill-down somente leitura |

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

**Admin** usa pipeline operacional em `/dashboard/admin/pipeline` (não confundir com o painel do perfil COMERCIAL).

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

## SIPOC (execução)

1. Admin homologa obra → `EM_EXECUCAO`
2. Tomador: evidências GPS → etapa `AGUARDANDO_VISTORIA`
3. Engenheiro aprova → `LiberacaoParcela` `AGUARDANDO_PAGAMENTO`
4. Admin confirma pagamento (SIPOC)
5. 100% etapas + valor pago → crédito `QUITADO`, obra `CONCLUIDA`

## Rotas removidas / redirect

Score, simulador interno, fundos, relatórios, checklist e alertas do engenheiro → redirects em `canonical-flow.ts`.

## Técnico

- **Jornada:** `JornadaGuard` + `GET /jornada`
- **Middleware:** `isCanonicalRouteAllowed` + legacy redirects
- **Beta legado:** `NEXT_PUBLIC_BETA_MVP_MODE=true` (não usar em produção)
