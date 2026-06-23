# Fluxo canônico — Imobi MVP (app de banco)

**Contexto:** beta guiado por um passo por vez. Sidebar oculta para tomador e gestor.

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API staging | https://imobi-api-staging.onrender.com |

## Jornada do tomador

```
Simular → Cadastro → Login → GET /api/v1/jornada → href do passo atual
```

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC | `/dashboard/kyc` |
| 2 | Obra | `/dashboard/obras/nova` |
| 3 | Crédito | `/dashboard/credito/solicitar` |
| 4 | Aguardar gestor | `/dashboard/construtor` (hero) |
| 5 | Acompanhar | `/dashboard/construtor` + crédito |

## Jornada do gestor

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC pendente | `/dashboard/gestor/kyc` |
| 2 | Etapas pendentes | `/dashboard/gestor/etapas` |
| 3 | Fila zerada | `/dashboard/gestor` (hero) |

## Comportamento técnico

- **Login:** `redirectAfterLogin()` busca `/api/proxy/jornada` e navega para `jornada.href`.
- **Guard:** `JornadaGuard` redireciona rotas fora do passo atual (conta/perfil sempre liberado).
- **Hub:** `/dashboard/construtor` e `/dashboard/gestor` mostram só `NextStepHero` quando é passo de espera/conclusão.
- **Fail-closed:** se `/jornada` falha, `JornadaError` com retry — não cai no painel antigo.
- **MVP mode:** `NEXT_PUBLIC_BETA_MVP_MODE` default `true` (setar `false` para menu completo).

## Módulos ativos no beta

auth, kyc, obras, etapas, credito, manager, jornada

## Congelado (UI oculta)

comercial, marketplace, comitê, score, fundos, mobile
