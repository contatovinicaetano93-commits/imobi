# Fluxo canônico — Imobi MVP (app de banco)

**Contexto:** beta guiado. Tomador/gestor navegam dentro do menu MVP; `GET /jornada` define o próximo passo.

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API staging | https://imobi-api-staging.onrender.com |

## Funil marketing → app autenticado

```
/envie-seu-projeto (ou /simulador → redirect) → POST /api/v1/propostas
       ↓
Cadastro/login (mesmo e-mail) → vincula proposta + cria rascunho de dossiê
       ↓
GET /api/v1/jornada → href do passo atual
```

## Jornada do cliente (role `TOMADOR` / `CONSTRUTOR`)

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC | `/dashboard/kyc` |
| 2 | Viabilidade (dossiê) | `/dashboard/proposta-credito` |
| 3 | Obra | `/dashboard/obras/nova` |
| 4 | Crédito | `/dashboard/credito/solicitar` |
| 5 | Aguardar gestor | `/dashboard/construtor` (hero) |
| 6 | Acompanhar | `/dashboard/construtor` + crédito |

`/dashboard/viabilidade` e `/dashboard/simulador` redirecionam para `/dashboard/proposta-credito`.

## Jornada do gestor

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC pendente | `/dashboard/gestor/kyc` (somente leitura) |
| 2 | Etapas pendentes | `/dashboard/gestor/etapas` |
| 3 | Fila zerada | `/dashboard/gestor` (hero) |

Admin aprova KYC em `/dashboard/admin/kyc` e vistorias em `/dashboard/admin/vistorias`.

## Comportamento técnico

- **Login:** `redirectAfterLogin()` busca `/api/proxy/jornada` e navega para `jornada.href`.
- **Guard:** `JornadaGuard` + middleware MVP; tomador/gestor têm sidebar MVP livre (não passo-a-passo estrito).
- **Gates API:** criar obra exige KYC aprovado + dossiê `APROVADO`; solicitar crédito exige obra cadastrada.
- **Proposta pública:** `POST /propostas` (Zod `EnviarPropostaPublicaSchema`); vínculo no auth por e-mail.
- **Fail-closed (web):** se `/jornada` falha, `JornadaError` com retry.
- **Upload proxy:** `/api/proxy/documentos` e `/api/proxy/kyc/upload` usam `fetchApiWithRetry`.
- **MVP mode:** `NEXT_PUBLIC_BETA_MVP_MODE` default `true`.

## OpenAPI

| Módulo | Spec |
|--------|------|
| Dossiês | `docs/api/openapi-dossies-v1.yaml` |
| Propostas | `docs/api/openapi-propostas-v1.yaml` |

## Módulos ativos no beta

auth, kyc, propostas, dossies (viabilidade), obras, etapas, credito, manager, jornada, documentos
