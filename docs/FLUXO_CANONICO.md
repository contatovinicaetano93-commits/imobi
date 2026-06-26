# Fluxo canônico — Imobi MVP (app de banco)

**Contexto:** beta guiado por um passo por vez. Sidebar oculta para tomador e gestor.

## URLs

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API staging | https://imobi-api-staging.onrender.com |

## Jornada do cliente (role `TOMADOR` / `CONSTRUTOR`)

Na interface, o perfil aparece como **Cliente** (mesmo role no backend).

```
Simular → Cadastro → Login → GET /api/v1/jornada → href do passo atual
```

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC | `/dashboard/kyc` |
| 2 | Viabilidade (dossiê) | `/dashboard/viabilidade` |
| 3 | Obra | `/dashboard/obras/nova` |
| 4 | Crédito | `/dashboard/credito/solicitar` |
| 5 | Aguardar gestor | `/dashboard/construtor` (hero) |
| 6 | Acompanhar | `/dashboard/construtor` + crédito |

## Jornada do gestor

| Ordem | Passo | Rota |
|-------|-------|------|
| 1 | KYC pendente | `/dashboard/gestor/kyc` |
| 2 | Etapas pendentes | `/dashboard/gestor/etapas` |
| 3 | Fila zerada | `/dashboard/gestor` (hero) |

## Comportamento técnico

- **Login:** `redirectAfterLogin()` busca `/api/proxy/jornada` e navega para `jornada.href` (passo atual da API).
- **Guard:** `JornadaGuard` redireciona rotas fora do passo atual (`isJornadaPathAllowed`); conta/perfil sempre liberados.
- **Gates API:** criar obra exige KYC aprovado + dossiê `APROVADO`; solicitar crédito exige obra cadastrada (SIPOC passo 0–3).
- **Legado:** `POST /due-diligence` retorna **410 Gone** — usar `/api/v1/dossies`.
- **Hub:** `/dashboard/construtor` e `/dashboard/gestor` mostram só `NextStepHero` quando é passo de espera/conclusão.
- **Fail-closed:** se `/jornada` falha, `JornadaError` com retry — não cai no painel antigo.
- **Upload proxy:** rotas `/api/proxy/documentos` e `/api/proxy/kyc/upload` usam `fetchApiWithRetry` (wake Render + retry).
- **MVP mode:** `NEXT_PUBLIC_BETA_MVP_MODE` default `true` (setar `false` para menu completo).

## Módulos ativos no beta

auth, kyc, dossies (viabilidade), obras, etapas, credito, manager, jornada, documentos

## Glossário de domínio (Imobi ≠ catálogo de produtos)

| Termo na UI | No banco / API | Observação |
|-------------|----------------|------------|
| Cliente | `Usuario` (TOMADOR / CONSTRUTOR) | Não é módulo de CRM genérico |
| Empreendimento / obra | `Obra` + `DueDiligence` | Equivalente operacional a “produto” de crédito |
| Documentos do fluxo | `KycDocumento`, `Documento`, checklist dossiê | Metadados no Postgres; binário S3/disco |
| Lead comercial | `Lead` | Schema pronto; UI congelada no beta |

## Persistência e “tempo real”

- **Fonte de verdade:** PostgreSQL (metadados) + S3 ou disco local (arquivos).
- **Atualização de painéis:** request/response + invalidação de cache de jornada (TTL 30s). Não há WebSocket/SSE no MVP.
- **Admin:** busca por tela (usuários, pipeline); busca global unificada — épico P1.

## Congelado (UI oculta)

comercial, marketplace, comitê, score, fundos, mobile
