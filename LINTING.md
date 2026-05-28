# ESLint Configuration Guide

Guia de configuração e uso de ESLint no monorepo **imbobi**.

## Estrutura

O ESLint está configurado com **flat config** (formato `eslintrc.js`):

- **Root config**: `.eslintrc.js` — configuração base para todo o monorepo
- **Workspace-specific**: cada workspace tem seu próprio `.eslintrc.js` que estende a config root
  - `/services/api/.eslintrc.js` — NestJS API
  - `/apps/web/.eslintrc.js` — Next.js Web
  - `/apps/mobile/.eslintrc.js` — React Native Mobile
  - `/packages/*/eslintrc.js` — pacotes compartilhados

## Rodando o Linter

### Verificar linting em todo o monorepo

```bash
pnpm lint
```

Isso roda `eslint` em paralelo em todos os workspaces via Turborepo.

### Verificar workspace específico

```bash
pnpm --filter @imbobi/web lint
pnpm --filter @imbobi/api lint
pnpm --filter @imbobi/mobile lint
pnpm --filter @imbobi/schemas lint
```

### Fixar problemas automaticamente

```bash
pnpm lint:fix
```

Aplica fixes automáticos em todos os workspaces.

### Fixar workspace específico

```bash
pnpm --filter @imbobi/web lint:fix
pnpm --filter @imbobi/api lint:fix
```

## Configuração de Regras

### Root ESLint Rules (`.eslintrc.js`)

Regras aplicadas a **todos os workspaces**:

#### Core ESLint
- `no-console: warn` — permite console mas avisa (use para debug)
- `no-var: error` — obriga uso de `const`/`let`
- `prefer-const: error` — use `const` quando possível
- `eqeqeq: error` — use `===` nunca `==`
- `no-debugger: error` — não deixe `debugger` no código
- `no-duplicate-imports: error` — não importe o mesmo módulo duas vezes
- `no-unused-expressions: error` — evite expressões sem efeito

#### TypeScript ESLint
- `@typescript-eslint/no-explicit-any: error` — evite `any`, use tipos específicos
- `@typescript-eslint/no-unused-vars: error` — sem variáveis não usadas (prefixe com `_` para ignorar)
- `@typescript-eslint/explicit-function-return-types: warn` — documente tipos de retorno
- `@typescript-eslint/no-floating-promises: error` — sempre `await` promises ou use `.catch()`
- `@typescript-eslint/no-misused-promises: error` — não passe promises onde boolean é esperado
- `@typescript-eslint/await-thenable: error` — só `await` em promises
- `@typescript-eslint/no-require-imports: error` — use `import` not `require()` (ESM)

#### React
- `react/react-in-jsx-scope: off` — Next.js 13+ não precisa
- `react/prop-types: off` — usamos TypeScript não PropTypes
- `react/display-name: off` — é ok para components gerados

#### React Hooks
- `react-hooks/rules-of-hooks: error` — nunca quebre as rules of hooks
- `react-hooks/exhaustive-deps: warn` — declare todas as deps em useEffect

## Integração com IDE

### VSCode

1. Instale extensão **ESLint** (dbaeumer.vscode-eslint)
2. Adicione ao `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.format.enable": true,
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Assim, ao salvar um arquivo, ESLint fixes são aplicados automaticamente.

### WebStorm / IntelliJ IDEA

1. Vá para **Preferences > Languages & Frameworks > JavaScript > ESLint**
2. Enable: `Automatic ESLint configuration`
3. Enable: `Run eslint --fix on Save`

### Neovim

Use plugins como [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig) com `eslint-lsp`:

```lua
require('lspconfig').eslint.setup({
  on_attach = function(client, bufnr)
    vim.api.nvim_create_autocmd("BufWritePre", {
      buffer = bufnr,
      command = "EslintFixAll",
    })
  end,
})
```

## Regras Custom por Workspace

### API (NestJS)

`.eslintrc.js` do `/services/api`:

- Permite decoradores do NestJS
- `@typescript-eslint/explicit-function-return-types: warn` é mais flexível para métodos
- `@typescript-eslint/no-floating-promises: warn` — relaxado para workers

### Web (Next.js)

`.eslintrc.js` do `/apps/web`:

- `react/react-in-jsx-scope: off` — Next.js não precisa
- `react/no-unescaped-entities: warn` — às vezes é OK

### Mobile (React Native)

`.eslintrc.js` do `/apps/mobile`:

- `no-console: [warn, { allow: ['warn', 'error', 'info'] }]` — logs de debug são OK
- `react/react-in-jsx-scope: off` — RN não precisa

## Git Hooks (Opcional)

Se desejar rodar ESLint antes de commit, use **Husky**:

```bash
npm install husky -D
npx husky install
npx husky add .husky/pre-commit "pnpm lint:fix"
```

Assim, antes de commitar, `pnpm lint:fix` roda automaticamente.

## CI/CD

A pipeline CI (`.github/workflows/lint.yml`) roda:

1. `pnpm lint` — valida todas os workspaces
2. Falha o build se houver erros
3. Commenta na PR se lint falhar

Para passar na CI:
```bash
pnpm lint:fix
git add .
git commit -m "chore: fix linting issues"
```

## Adicionando Novas Regras

Para adicionar uma regra global a todos os workspaces:

1. Edite `.eslintrc.js` (root) na seção `rules`
2. Rode `pnpm lint` para validar
3. Rode `pnpm lint:fix` para aplicar

Para override em um workspace específico:

1. Edite `.eslintrc.js` do workspace
2. Adicione a regra na seção `rules`

Exemplo:

```javascript
// /services/api/.eslintrc.js
export default [
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'minha-regra-custom': 'error', // novo
    },
  },
];
```

## Troubleshooting

### "ESLint configuration not found"

```bash
# Garanta que .eslintrc.js existe em cada workspace
ls .eslintrc.js apps/web/.eslintrc.js services/api/.eslintrc.js

# Reinstale dependencies
pnpm install
```

### "Plugin not found: @typescript-eslint"

```bash
# Garanta que as devDependencies estão instaladas
pnpm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### ESLint não funciona no VSCode

1. Reload window: `Cmd+Shift+P` > "Reload Window"
2. Verifique ESLint extension está enabled
3. Verifique output: `View > Output > ESLint`

## Referências

- [ESLint Flat Config Docs](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [TypeScript ESLint Plugin Docs](https://typescript-eslint.io/)
- [React Hooks ESLint Plugin](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks)
