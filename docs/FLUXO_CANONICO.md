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

Comitê, KYC operacional e liberações são **internos** (Admin / Engenheiro). O gestor **não participa** desses processos.

## Engenheiro

| Passo | Rota |
|-------|------|
| Vistorias | `/dashboard/engenheiro/vistoria` |
| Obras (evidências) | `/dashboard/obras` |
| Parecer comitê | `/dashboard/engenheiro/comite` |

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

Score, simulador interno, fundos, relatórios, comercial, checklist e alertas do engenheiro → redirects em `canonical-flow.ts`.

## Técnico

- **Jornada:** `JornadaGuard` + `GET /jornada`
- **Middleware:** `isCanonicalRouteAllowed` + legacy redirects
- **Beta legado:** `NEXT_PUBLIC_BETA_MVP_MODE=true` (não usar em produção)
