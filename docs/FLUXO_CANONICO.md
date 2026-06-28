# Fluxo canônico — Imobi (lançamento)

**Contexto:** produção guiada. Tomador/gestor seguem `GET /jornada` passo a passo (`NEXT_PUBLIC_GUIDED_STRICT=true`).

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API staging | https://imobi-api-staging.onrender.com |

## Funil marketing → app autenticado

```
/envie-seu-projeto → POST /api/v1/propostas
       ↓
Cadastro/login (mesmo e-mail) → vincula proposta + rascunho dossiê
       ↓
GET /api/v1/jornada → href do passo atual (redirect estrito)
```

## Jornada do cliente (TOMADOR / CONSTRUTOR)

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC | `/dashboard/kyc` |
| 2 | Viabilidade | `/dashboard/proposta-credito` |
| 3 | Obra | `/dashboard/obras/nova` |
| 4 | Crédito (comitê) | `/dashboard/credito/solicitar` |
| 5 | Aguardando comitê | `/dashboard/construtor` |
| 6 | Acompanhar liberações | `/dashboard/credito` + obras |
| 7 | Operação quitada | `/dashboard/construtor` (nova operação) |

## Jornada do gestor (somente leitura)

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | Fila KYC | `/dashboard/gestor/kyc` |
| 2 | Fila etapas | `/dashboard/gestor/etapas` |
| 3 | Fila zerada | `/dashboard/gestor` |

**Aprovações:** Admin (KYC, dossiê, homologação, comitê, pagamento) · Engenheiro (vistoria técnica).

## SIPOC execução + pagamento

1. Admin homologa obra → `EM_EXECUCAO`
2. Tomador envia evidências GPS
3. Engenheiro aprova etapa → liberação `AGUARDANDO_PAGAMENTO`
4. Admin confirma pagamento → parcela `CONCLUIDA`
5. Quando 100% etapas + valor liberado → crédito `QUITADO`, obra `CONCLUIDA`

## Comportamento técnico

- **Login:** `redirectAfterLogin()` → `/jornada.href`
- **Guard:** `JornadaGuard` redireciona rotas fora do passo (estrito)
- **Gates API:** obra (KYC + dossiê); crédito comitê (obra); comitê valida jornada
- **Vistoria:** `/vistoria` e `/engenheiros` delegam ao mesmo `EtapasService`
- **Beta menu legado:** `NEXT_PUBLIC_BETA_MVP_MODE=true` (não usar em produção)

## OpenAPI

| Módulo | Spec |
|--------|------|
| Jornada | `docs/api/openapi-jornada-v1.yaml` |
| Propostas | `docs/api/openapi-propostas-v1.yaml` |
| Dossiês | `docs/api/openapi-dossies-v1.yaml` |

Ver checklist: `docs/LAUNCH_3_DIAS.md`
