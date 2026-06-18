# IMOBI - Plano Tri-Agente: Cursor, Claude e Slack

Use este documento como ponto de partida para coordenar trabalho entre Cursor,
Claude e Slack sem perder contexto do plano de produto.

## Estado atual da branch

- Branch de trabalho: `cursor/roles-slack-architecture-e110`
- PR: #62
- Base: `main`
- Ultimo foco: perfis, RBAC e handoff operacional.
- Validacoes recentes:
  - `pnpm db:generate && pnpm type-check` passou.
  - `pnpm --filter @imbobi/schemas lint` passou.
  - `pnpm --filter @imbobi/api lint` passou com warnings existentes.
  - `pnpm --filter @imbobi/web lint` passou com warnings existentes.
  - `pnpm --filter @imbobi/mobile lint` passou com 3 warnings antigos fora do RBAC.
- Testes Jest globais dependem de PostgreSQL/Redis locais e hoje nao rodam limpos sem
  ambiente preparado.

## Fonte de verdade atual

### Stack

- Monorepo Turborepo + pnpm workspaces.
- Web: Next.js em `apps/web`.
- Mobile: Expo em `apps/mobile`.
- API: NestJS + Fastify em `services/api`.
- Schemas/RBAC: `packages/schemas`.
- Core client/hooks: `packages/core`.

### Perfis de negocio

O plano trabalha com 5 perfis:

| Perfil de produto | Tipo canonico | Aliases/compatibilidade |
| --- | --- | --- |
| Tomador | `TOMADOR` | `CONSTRUTOR` em fluxos legados |
| Admin | `ADMIN` | nenhum |
| Gestor do Fundo | `GESTOR` | `GESTOR_FUNDO` normalizado para `GESTOR` |
| Engenheiro | `ENGENHEIRO` | `GESTOR_OBRA` em fluxos legados |
| Comercial parceiro | `COMERCIAL` | `PARCEIRO` em fluxos comerciais/parceiros |

RBAC centralizado em:

- `packages/schemas/src/rbac.ts`

Esse arquivo contem:

- normalizacao de roles;
- labels;
- homes web/mobile;
- grupos de acesso;
- regras de rotas web;
- regras de tabs mobile;
- helpers `roleCanAccess`, `roleCanAccessFeature`, `roleCanAccessMobileTab`.

Nao recriar regras de roles em web/API/mobile. Importar do pacote compartilhado.

## Divisao de responsabilidades

### Cursor Pro / Desktop

Use para trabalho multi-arquivo e integracao visual:

- ajustar UI web/mobile;
- conectar telas existentes a endpoints;
- criar testes E2E/Playwright;
- revisar UX dos dashboards por perfil;
- resolver conflitos e refactors pequenos/medios.

### Claude

Use para trabalho de arquitetura e backend:

- revisar contratos API/RBAC;
- implementar testes unitarios/e2e de autorizacao;
- consolidar modelos Prisma e migrations;
- revisar workers BullMQ;
- revisar seguranca, LGPD, audit logs e ownership checks;
- preparar plano tecnico para features grandes.

### Cursor no Slack

Use apenas para operacao e triagem curta:

- health check API;
- smoke test web/simulador/mobile;
- acordar API Render em 503 transitorio;
- hotfix de copy/CSS em 1 arquivo;
- relatar bug com URL, horario, passos e screenshot;
- checklist de arquivos alterados antes de merge humano.

Nao usar Slack para:

- migrations;
- secrets;
- Terraform/AWS;
- refactor multi-arquivo;
- merge com conflito;
- alteracao de contrato API/DB.

## Checklist para comecar hoje

1. Abrir a branch `cursor/roles-slack-architecture-e110`.
2. Ler:
   - `docs/SLACK_ARCHITECTURE_HANDOFF.md`
   - este arquivo
   - `CLAUDE.md`
3. Rodar, se necessario:
   - `pnpm install`
   - `pnpm db:generate`
   - `pnpm type-check`
4. Confirmar que o PR #62 esta atualizado.
5. Escolher uma trilha pequena e fechar com commit/push antes de mudar de foco.

## Proximas trilhas recomendadas

### Trilha A - Testes RBAC dos 5 perfis

Objetivo: garantir que Tomador, Admin, Gestor, Engenheiro e Comercial/Parceiro
tenham acesso correto na API e web.

Status atual:

- testes unitarios adicionados em `services/api/src/common/rbac.spec.ts`;
- testes unitarios do guard adicionados em `services/api/src/common/guards/roles.guard.spec.ts`;
- smoke tests da matriz de rotas web adicionados em `services/api/src/common/web-route-rbac.spec.ts`;
- cobertura incluida:
  - `normalizeUserRole`;
  - `roleCanAccess`;
  - `roleCanAccessFeature`;
  - `roleCanAccessMobileTab`;
  - homes web/mobile;
  - labels dos 5 perfis;
  - `GESTOR_FUNDO` como alias de `GESTOR`;
  - `PARCEIRO` em endpoints comerciais;
  - `GESTOR_OBRA` em endpoints de engenharia;
  - bloqueios esperados para perfis fora do grupo;
  - rotas principais dos 5 paineis:
    - `/dashboard/construtor`;
    - `/dashboard/gestor`;
    - `/dashboard/engenheiro`;
    - `/dashboard/comercial`;
    - `/dashboard/admin`.
- validacao focada:
  - `pnpm --filter @imbobi/api test -- --runInBand src/common/rbac.spec.ts src/common/guards/roles.guard.spec.ts src/common/web-route-rbac.spec.ts`
  - resultado: 3 suites, 32 testes passando.

Concluido:

- adicionar testes unitarios para `packages/schemas/src/rbac.ts`;
- adicionar testes do `RolesGuard` usando roles canonicos e aliases;
- adicionar smoke tests de matriz compartilhada para rotas principais:
  - `/dashboard/construtor`;
  - `/dashboard/gestor`;
  - `/dashboard/engenheiro`;
  - `/dashboard/comercial`;
  - `/dashboard/admin`.

Ainda pendente:

- quando o ambiente local de Postgres/Redis estiver pronto, expandir para testes API/E2E
  de endpoints reais por perfil.
- se for necessario testar o middleware Next em runtime, adicionar Playwright smoke
  com servidores locais e storageState por perfil.

### Trilha B - Mobile por perfil

Objetivo: evoluir o mobile alem do RBAC basico.

Estado atual:

- login salva role normalizada;
- tabs sem permissao sao ocultadas;
- acesso direto a Obras/Credito e bloqueado quando nao permitido;
- Engenheiro/GESTOR_OBRA agora entram em `/(tabs)/engenheiro`;
- primeira tela mobile do Engenheiro criada em `apps/mobile/app/(tabs)/engenheiro/index.tsx`;
- tela consome `GET /engenheiros/visitas` via `engenheirosApi.visitas()`;
- ainda faltam telas especificas para Gestor e Comercial.

Proximo passo:

- validar a tela de Engenheiro contra dados reais/staging;
- depois definir Comercial: resumo de leads ou perfil parceiro;
- depois Gestor: fila resumida de aprovacoes.

### Trilha C - Comercial vs Parceiro

Objetivo: decidir se `COMERCIAL` e `PARCEIRO` sao a mesma experiencia ou duas
experiencias.

Pergunta de produto:

- parceiro externo ve o mesmo pipeline do comercial interno?
- ou ve apenas indicacoes/comissoes/materiais?

Enquanto nao decidir, manter compatibilidade:

- `COMERCIAL` e `PARCEIRO` acessam dashboard comercial;
- endpoints de parceiros continuam separados quando a regra for especifica.

### Trilha D - Ambiente de testes

Objetivo: permitir que Jest e E2E rodem confiavelmente.

Gaps atuais:

- PostgreSQL local em `localhost:5432` nao esta disponivel;
- Redis local tambem e requisito para partes da suite;
- algumas specs de throttler tem expectativas antigas.

Proximo passo:

- criar script/documentacao de test env com Postgres + Redis;
- separar testes unitarios puros de testes e2e com infra;
- corrigir specs antigas de throttler.

## Prompts prontos

### Prompt para Claude - RBAC/tests

```text
Estamos no repo IMOBI, branch cursor/roles-slack-architecture-e110.
Leia CLAUDE.md, docs/Plano-Tri-Agente-IMOBI.md e docs/SLACK_ARCHITECTURE_HANDOFF.md.

Objetivo: adicionar uma matriz de testes RBAC para os 5 perfis do plano:
TOMADOR, ADMIN, GESTOR, ENGENHEIRO e COMERCIAL/PARCEIRO.

Fonte de verdade de RBAC: packages/schemas/src/rbac.ts.
Nao duplicar regras em web/API/mobile.

Comece por testes unitarios do pacote schemas e RolesGuard. Depois proponha ou implemente
smokes de rotas web/API se couber no escopo.
Rode pnpm db:generate && pnpm type-check e lints relevantes.
Commit + push na branch atual.
```

### Prompt para Cursor Pro - mobile por perfil

```text
Estamos no repo IMOBI, branch cursor/roles-slack-architecture-e110.
Leia docs/Plano-Tri-Agente-IMOBI.md.

Objetivo: evoluir mobile por perfil usando o RBAC ja centralizado em
packages/schemas/src/rbac.ts.

Nao criar regras locais novas. Use roleCanAccessMobileTab/getMobileRoleHome.
Primeiro desenhe/implemente a tela mobile do Engenheiro com fila de vistorias
ou um placeholder operacional seguro se a API ainda nao estiver pronta.
Rode type-check/lint, commit e push.
```

### Prompt para Slack - health/smoke

```text
IMOBI smoke test operacional:
1. GET https://imobi-api-efgg.onrender.com/api/v1/health (retry se 503).
2. Abrir https://imobi-web-ten.vercel.app e /simulador no mobile.
3. Testar fluxo simulador ate WhatsApp.
4. Reportar status, URL, horario e qualquer screenshot.

Nao alterar codigo salvo hotfix de copy/CSS em 1 arquivo.
Anexo: docs/Plano-Tri-Agente-IMOBI.md
```

## Definition of Done para cada ciclo

- Mudanca pequena e coesa.
- Sem duplicar regra de RBAC.
- `pnpm db:generate && pnpm type-check` passando.
- Lint do pacote alterado passando, warnings conhecidos documentados.
- Commit descritivo.
- Push para branch.
- PR atualizado.
- Handoff/documentacao atualizada quando mudar arquitetura ou fluxo operacional.

