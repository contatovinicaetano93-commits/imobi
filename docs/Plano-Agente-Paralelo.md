# Plano de Trabalho — Agente Paralelo (Mobile RBAC + E2E)

**Branch alvo**: `claude/imobi-mobile-rbac-parallel` (criar a partir de `main`)
**Repo**: `contatovinicaetano93-commits/imobi`
**Stack**: Expo 51 + Expo Router (`apps/mobile`), NestJS tests (`services/api`)

---

## Contexto

O sprint de RBAC hardening está em andamento no backend (branch `claude/imobi-rbac-backend-bktkih`).
Este agente trata do **lado cliente** (mobile) e dos **testes e2e** que precisam de correção.

---

## Tarefa 1 — Mobile: Armazenar e Expor o Papel do Usuário

**Problema**: O app mobile (`apps/mobile`) autentica o usuário e guarda apenas o `accessToken` no `SecureStore`. Nenhum dos componentes sabe qual é o `tipo` do usuário (TOMADOR, GESTOR, ENGENHEIRO, etc.), então todas as telas aparecem para todo mundo.

**Arquivos relevantes**:
- `apps/mobile/app/_layout.tsx` — bootstrap de autenticação
- `apps/mobile/app/(tabs)/_layout.tsx` — tab bar (Obras / Crédito / Perfil)
- `apps/mobile/lib/api.ts` — contém `usuariosApi.obterPerfil()` e o tipo `UsuarioPerfil`

**O que fazer**:

### 1a. Criar um contexto de autenticação

Crie `apps/mobile/contexts/AuthContext.tsx`:

```tsx
import { createContext, useContext, useState, ReactNode } from "react";

type UserTipo = "TOMADOR" | "GESTOR" | "ADMIN" | "ENGENHEIRO" | "COMERCIAL" | "PARCEIRO" | null;

interface AuthContextValue {
  userTipo: UserTipo;
  setUserTipo: (tipo: UserTipo) => void;
}

const AuthContext = createContext<AuthContextValue>({ userTipo: null, setUserTipo: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userTipo, setUserTipo] = useState<UserTipo>(null);
  return <AuthContext.Provider value={{ userTipo, setUserTipo }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

### 1b. Popular o tipo no bootstrap

Em `apps/mobile/app/_layout.tsx`, após encontrar o token, chamar `usuariosApi.obterPerfil()` e guardar `profile.tipo` no contexto.
Envolva `<Stack>` com `<AuthProvider>`.

### 1c. Exibir tabs condicionais

Em `apps/mobile/app/(tabs)/_layout.tsx`, usar `useAuth()` para ler `userTipo`.
Regras de visibilidade:
- **TOMADOR**: vê Obras + Crédito + Perfil (comportamento atual)
- **ENGENHEIRO**: vê Vistorias + Perfil (sem Obras ou Crédito — engenheiro não tem obras próprias)
- **GESTOR / ADMIN**: vê todas as tabs
- **COMERCIAL / PARCEIRO**: vê Leads + Perfil (sem Obras ou Crédito)
- Se `userTipo` ainda é `null` (carregando), mostrar apenas Perfil ou spinner

Use `tabBarItemStyle: { display: "none" }` em `Tabs.Screen` para esconder tabs de forma declarativa (evita unmount abrupto).

---

## Tarefa 2 — Mobile: Tratamento de Erros 403

**Problema**: `apps/mobile/lib/api.ts` só trata 401 (chama `_onUnauthorized` → logout). Se a API retornar 403 (ForbiddenException — usuário tenta acessar recurso de outro usuário), o erro é lançado como genérico e a UI mostra a mensagem crua ou quebra silenciosamente.

**O que fazer**:

Em `apps/mobile/lib/api.ts`, na função `callApi`, adicionar tratamento de 403:

```ts
async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        await SecureStore.deleteItemAsync("accessToken");
        _onUnauthorized?.();
      }
      if (e.status === 403) {
        throw new ApiError(403, "Você não tem permissão para acessar este recurso.");
      }
    }
    throw e;
  }
}
```

Nas telas que fazem chamadas de API (pelo menos `apps/mobile/app/(tabs)/obras/index.tsx` e `apps/mobile/app/(tabs)/obras/[id]/index.tsx`), tratar o erro 403 exibindo uma mensagem específica em vez do erro genérico.

Exemplo em `obras/index.tsx`:
```tsx
} catch (e: any) {
  if (e instanceof ApiError && e.status === 403) {
    setError("Você não tem permissão para ver estas obras.");
  } else {
    setError(e.message ?? "Erro ao carregar obras");
  }
}
```

---

## Tarefa 3 — Corrigir E2E: `obras.e2e.spec.ts`

**Arquivo**: `services/api/src/modules/obras/obras.e2e.spec.ts`

**Problema provável**: O endpoint `POST /api/v1/obras` espera um payload com campos específicos. Verifique o `ObrasController` e o schema Zod em `packages/schemas` para ver o formato exato.

Execute os testes e2e de obras localmente (com banco de teste disponível) e corrija os payloads.

Padrão de payload correto (verificar no controller/schema antes de editar):
```ts
{
  nome: "Obra Test",
  endereco: "Rua Test, 123",   // string simples
  geoLatitude: -23.55,
  geoLongitude: -46.63,
  raioValidacaoMetros: 50,
}
```

Se o teste falhar porque o endpoint `/api/v1/auth/registrar` retorna campos diferentes dos esperados, ajuste o destructuring.

---

## Tarefa 4 — Corrigir E2E: `credito.e2e.spec.ts`

**Arquivo**: `services/api/src/modules/credito/credito.e2e.spec.ts`

**Problema provável**: O teste de criação de crédito pode usar campos incorretos. Verifique o `CreditoController` e schemas antes de editar.

---

## Tarefa 5 — Frontend Web: Proteção de Página para ENGENHEIRO

**Arquivo**: `apps/web/app/(dashboard)/engenheiro/vistoria/page.tsx` (verificar se existe)

O layout web (`apps/web/app/(dashboard)/layout.tsx`) já foi atualizado no branch de backend para remover o link de "Minhas Obras" do ENGENHEIRO. Mas a rota `/dashboard/obras` ainda é acessível diretamente por URL, retornando lista vazia (não ideal — deve retornar 403 explícito ou redirect).

Verificar se existe middleware de proteção em `apps/web/middleware.ts`. Se não, adicionar verificação de `tipo` no `layout.tsx` das rotas de obras para redirecionar ENGENHEIRO para `/dashboard/engenheiro/vistoria`.

---

## Como Trabalhar

1. Criar branch local: `git checkout -b claude/imobi-mobile-rbac-parallel`
2. Implementar Tarefas 1-2 (mobile context + 403 handling) — não requerem DB
3. Implementar Tarefas 3-4 (e2e fixes) — requerem DB de teste
4. Implementar Tarefa 5 (web guard) — não requer DB
5. Commit e push: `git push -u origin claude/imobi-mobile-rbac-parallel`

---

## Não Fazer

- Não tocar em `services/api` exceto para corrigir e2e tests
- Não commitar `.env` — usar `.env.example` como referência
- Não duplicar validações Zod — os schemas estão em `packages/schemas`
- Não criar PRs sem instrução explícita do usuário
