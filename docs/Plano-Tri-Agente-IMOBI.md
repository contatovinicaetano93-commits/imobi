# Plano Tri-Agente IMOBI

Documento de coordenação entre agentes. Atualizar sempre que houver mudança de arquitetura ou decisão relevante.

---

## Contexto

Monorepo com 5 perfis de usuário:
| Perfil | Código | Acesso |
|---|---|---|
| Tomador | `TOMADOR` | Próprias obras, créditos e KYC |
| Administrador | `ADMIN` | Acesso total; aprova crédito, DD, KYC |
| Gestor do Fundo | `GESTOR` (alias legado: `GESTOR_FUNDO`) | Painel `/manager`, due-diligence, KYC |
| Engenheiro | `ENGENHEIRO` | Validação de evidências de obra |
| Comercial/Parceiro | `COMERCIAL` / `PARCEIRO` | A definir – sem endpoints restritos mapeados ainda |

RBAC centralizado em `packages/schemas/src/rbac.ts` (único source-of-truth para roles).  
Utilitários de normalização: `services/api/src/common/constants/manager-roles.ts`.

---

## Trabalho Concluído (Agente Backend)

### Correções de Segurança

| Arquivo | Problema | Correção |
|---|---|---|
| `services/api/src/modules/evidencias/evidencias.service.ts` | `validar()` bloqueava ENGENHEIRO mesmo com `@Roles("ENGENHEIRO")` no controller | Adicionado `\|\| tipo !== "ENGENHEIRO"` na verificação |
| `services/api/src/modules/due-diligence/due-diligence.controller.ts` | `criar` e `listar` abertas para qualquer usuário autenticado; `gestorId` sugere restrição | Adicionado `@UseGuards(RolesGuard) @Roles("GESTOR", "ADMIN")` em ambas |
| `services/api/src/modules/etapas/etapas.service.ts` | `listarPorObra()` sem ownership check — qualquer usuário autenticado via GET /etapas/obra/:obraId podia ver etapas alheias | Adicionado `findUnique` da obra + check `obra.usuarioId !== usuario.id` (bypass para ADMIN/GESTOR/ENGENHEIRO) |
| `services/api/src/modules/etapas/etapas.controller.ts` | `listar()` não passava o usuário para o service | Adicionado `@UsuarioAtual()` e passagem para `listarPorObra(obraId, u)` |

### Testes Unitários (sem DB/Redis)

| Arquivo | Testes | Cobertura |
|---|---|---|
| `services/api/src/common/rbac.spec.ts` | 21 | `normalizeUserRole`, `isGestorRole`, `isManagerRole`, `MANAGER_ROLES` |
| `services/api/src/common/guards/roles.guard.spec.ts` | 13 | `RolesGuard` – todos os 5 perfis + alias legado |
| `services/api/src/modules/obras/obras-ownership.spec.ts` | 12 | `buscar`/`progressoGeral`: dono ✓ ADMIN ✓ atacante ✗ |
| `services/api/src/modules/credito/credito-ownership.spec.ts` | 7 | `extrato` ownership + scoping de `buscarPorUsuario` |
| `services/api/src/modules/due-diligence/due-diligence-ownership.spec.ts` | 10 | `buscar`/`listar`/`atualizarStatus` |
| `services/api/src/modules/evidencias/evidencias-rbac.spec.ts` | 22 | upload geofence, listar (bypass GESTOR/ADMIN), validar roles |
| `services/api/src/modules/etapas/etapas-ownership.spec.ts` | 12 | `listarPorObra` ownership (dono ✓, ADMIN/GESTOR/ENGENHEIRO ✓, atacante ✗) + `atualizarStatus` |

**Total: 97 testes unitários passando.**

### Testes E2E (requerem Postgres + Redis)

| Arquivo | Cenários | Descrição |
|---|---|---|
| `services/api/src/common/rbac-cross-user.e2e.spec.ts` | 30 | **Cross-user**: TOMADOR não acessa recurso de outro usuário; ADMIN/GESTOR/ENGENHEIRO acessam o que é deles |
| `services/api/src/modules/due-diligence/due-diligence.e2e.spec.ts` | 15 | CRUD completo de DD com roles corretas + regressão do fix de RBAC |

---

## Gaps Identificados (não corrigidos — mudança de comportamento, não bug)

| Endpoint | Situação | Decisão |
|---|---|---|
| `POST /credito/solicitar` | Restrito a ADMIN (admin cria crédito para o tomador) | Intencional — fluxo admin-controlled |
| `GET /obras/:id` com GESTOR (não-dono) | GESTOR não pode ver obra de um tomador diretamente | Acesso via `/manager/etapas-pendentes` é o caminho correto |
| Perfis `COMERCIAL`/`PARCEIRO` | Sem endpoints restritos específicos mapeados | Aguardando definição de acesso no roadmap |

---

## Trabalho Concluído (Agente Frontend)

### 403 vs 404 na UI

| Arquivo | Mudança |
|---|---|
| `apps/web/app/(dashboard)/error.tsx` | Error boundary diferencia 403 ("Sem permissão" + ícone cadeado) vs 404 ("Não encontrado" + ícone lupa) vs erros genéricos. Detecta via `error.status` (client-side) e fallback por `error.message` para RSC. |

## Trabalho Concluído (DevOps / Infra)

### CI Pipeline

| Arquivo | Mudança |
|---|---|
| `.github/workflows/ci-cd.yml` | Adicionado job `unit-tests` (Stage 1b) que roda todos os testes unitários RBAC sem DB/Redis. E2E step atualizado para cobrir `rbac-cross-user.e2e` + `due-diligence.e2e` + `auth.e2e`. Job `status` aguarda `unit-tests`. |

## Próximos Passos

### Agente Backend
- [ ] Auditar se COMERCIAL/PARCEIRO precisa de endpoints próprios ou herda acesso de algum perfil
- [ ] `comercial`: `listarLeads` retorna todos os leads sem filtrar por `usuarioId` — confirmar se é CRM compartilhado (intencional) ou gap de ownership
- [ ] `engenheiros.service.ts` `etapasDaObra()`: sem verificação de atribuição — aceitar como fund-wide (igual a `financeiro()`) ou restringir por obra?
- [ ] Rever se `obras.buscar` deve permitir GESTOR (além de ADMIN) para acesso cross-user

### Agente Frontend / Mobile
- [ ] Garantir que o cliente não exiba opções de menu para perfis sem permissão (ex: link `/manager` visível para TOMADOR)

### DevOps / Infra
- [ ] Configurar `.env.test` com Postgres e Redis para CI (já há infraestrutura; falta o arquivo de segredos)
- [ ] Verificar se `docker-compose.test.yml` existe para o job `e2e-tests.yml`

---

## Comandos de Teste

```bash
# Unitários (sem DB) — rodam imediatamente
pnpm --filter @imbobi/api test -- --testPathPattern="rbac|roles.guard|ownership|rbac-spec"

# E2E RBAC (requerem DB+Redis configurados em .env.test)
pnpm --filter @imbobi/api test -- --testPathPattern="rbac-cross-user|due-diligence.e2e"

# Full suite
pnpm --filter @imbobi/api test
```
