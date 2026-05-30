# CI/CD & Automations Setup - imobi

Este documento descreve a configuração completa de CI/CD e automações do projeto imobi.

## 📋 Configurações Implementadas

### 1. GitHub Actions Workflows

#### Type Check (`workflows/type-check.yml`)
- **Trigger**: Push + Pull Request
- **O que faz**: Executa `pnpm type-check` em todos os pacotes
- **Tempo**: ~5-10 minutos
- **Falha se**: Qualquer package tiver erros TypeScript

#### Build (`workflows/build.yml`)
- **Trigger**: Push + Pull Request
- **O que faz**: Executa `pnpm build` com cache de node_modules e Turbo
- **Tempo**: ~15-20 minutos (primeiro run), ~5 minutos (com cache)
- **Artefatos**: Logs de build se falhar
- **Falha se**: Qualquer package falhar build

#### Security Audit (`workflows/security-audit.yml`)
- **Trigger**: Semanal (quinta-feira às 02:00 UTC) + push em `package.json`
- **O que faz**: Executa `pnpm audit` e cria issues automaticamente se vulnerabilidades encontradas
- **Artefatos**: Relatório de audit armazenado por 30 dias
- **Issues**: Labels: `security`, `audit`, `dependencies`

### 2. Dependabot Configuration (`dependabot.yml`)

Configuração automática de atualização de dependências com 3 ecosystems:

#### NPM (npm)
- **Frequência**: Semanal (segunda-feira às 03:00 UTC)
- **Grupos**: Patch/Minor (automático) + Major (manual)
- **Auto-merge**: Squash para patch/minor
- **Reviewers**: contato.vinicaetano93@gmail.com
- **Labels**: `dependencies`, `automation`

#### Docker
- **Frequência**: Semanal (segunda-feira às 04:00 UTC)
- **Labels**: `dependencies`, `docker`, `automation`

#### GitHub Actions
- **Frequência**: Semanal (segunda-feira às 05:00 UTC)
- **Labels**: `dependencies`, `github-actions`, `automation`

### 3. Pull Request Template (`pull_request_template.md`)

Checklist automático para PRs incluindo:
- [ ] Type-check passa
- [ ] Build passa
- [ ] Tests passam (se aplicável)
- [ ] Security audit passa
- [ ] Sem dados sensíveis
- [ ] Documentação atualizada

### 4. Pre-push Hook (`scripts/pre-push.sh`)

Hook local que executa `pnpm type-check` antes de push:
- **Arquivo**: `.git/hooks/pre-push` (criado automaticamente)
- **O que faz**: Impede push se type-check falhar
- **Como contornar**: `git push --no-verify` (não recomendado)

---

## 🚀 Como Habilitar

### Pré-requisitos
- GitHub Actions habilitado no repositório (padrão)
- Permissões: `contents: read`, `issues: write`, `security-events: write`

### 1. Habilitar Workflows no GitHub

**Via UI:**
1. Ir para `Settings > Actions > General`
2. Garantir que "Actions is enabled"
3. Em "Actions permissions", selecionar "Allow all actions and reusable workflows"
4. Salvar

**Via CLI (gh):**
```bash
gh repo edit --enable-discussions \
  --allow all \
  --restrictions-enable-workflow
```

### 2. Habilitar Dependabot

**Via UI:**
1. Ir para `Settings > Security > Dependabot`
2. Habilitar "Dependabot alerts" (verde)
3. Habilitar "Dependabot security updates" (verde)
4. Habilitar "Dependabot version updates" (verde)
5. Salvar

**Nota**: A configuração `dependabot.yml` será lida automaticamente.

### 3. Configurar Pre-push Hook

**Automático** (rodado em `pnpm install`):
```bash
pnpm install
# O hook é instalado automaticamente no postinstall
```

**Manual**:
```bash
pnpm run setup-hooks
# ou
bash scripts/setup-hooks.sh
```

### 4. Testar Configurações

#### Testar type-check local:
```bash
pnpm type-check
```

#### Testar build local:
```bash
pnpm build
```

#### Testar security audit local:
```bash
pnpm audit
```

#### Testar pre-push hook:
```bash
# Criar um branch de teste com tipo inválido
git checkout -b test/pre-push-hook
# (fazer uma mudança que quebra tipos)
git add .
git commit -m "test: intentional type error"
git push  # Deve ser bloqueado pelo hook
```

---

## 📊 Checklist de Ativação

### GitHub Actions
- [ ] Settings > Actions > General > Actions is enabled
- [ ] Settings > Actions > General > Allow all actions and reusable workflows
- [ ] Workflows criados em `.github/workflows/`:
  - [ ] `type-check.yml` ✓
  - [ ] `build.yml` ✓
  - [ ] `security-audit.yml` ✓
- [ ] Próximo commit com mudança deve rodar workflows automaticamente

### Dependabot
- [ ] Settings > Security > Dependabot > Dependabot alerts (ON)
- [ ] Settings > Security > Dependabot > Dependabot security updates (ON)
- [ ] Settings > Security > Dependabot > Dependabot version updates (ON)
- [ ] `.github/dependabot.yml` criado ✓
- [ ] Dependabot deve começar a criar PRs em segunda-feira às 03:00 UTC

### Pull Request Template
- [ ] `.github/pull_request_template.md` criado ✓
- [ ] Próxima PR deve mostrar checklist automaticamente

### Pre-push Hook
- [ ] `scripts/pre-push.sh` criado ✓
- [ ] `scripts/setup-hooks.sh` criado ✓
- [ ] package.json atualizado com scripts ✓
- [ ] Executar `pnpm run setup-hooks` ou `pnpm install`
- [ ] `.git/hooks/pre-push` deve existir e ser executável

---

## 🔄 Fluxo de Desenvolvimento

### Para cada feature/bugfix:

```bash
# 1. Criar branch
git checkout -b feature/sua-feature

# 2. Fazer mudanças
# ... seu código ...

# 3. Verificar localmente antes de commit
pnpm type-check
pnpm build
pnpm test
pnpm audit

# 4. Commit
git add .
git commit -m "feat: sua feature"

# 5. Push (pre-push hook executa type-check automaticamente)
git push origin feature/sua-feature

# 6. GitHub Actions
#    ├─ type-check.yml (automático)
#    ├─ build.yml (automático)
#    └─ security-audit.yml (se modificar package.json)

# 7. Criar PR (PR template aparece automaticamente)
# GitHub Actions verifica tudo

# 8. Review + Merge
```

---

## 🔒 Segurança

### Security Audit
- Executa semanalmente (quinta-feira às 02:00 UTC)
- Cria issue automaticamente se vulnerabilidades encontradas
- Labels: `security`, `audit`, `dependencies`
- Frequência: Máximo 1 issue por semana (atualiza existente)

### Dependabot
- Cria PRs para atualizações automáticas
- Auto-merge disponível para patch/minor (configurável)
- Scanning de vulnerabilidades nativas no GitHub

---

## 📝 Variáveis de Ambiente

Nenhuma variável de ambiente é necessária para workflows. Todos usam:
- `GITHUB_TOKEN` (automático)
- Node.js 22.x
- pnpm 9.x

---

## 🐛 Troubleshooting

### Type-check falha localmente mas passa na CI
```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm type-check
```

### Pre-push hook não está sendo executado
```bash
# Verificar se existe
ls -la .git/hooks/pre-push

# Reinstalar
pnpm run setup-hooks

# Ou manualmente
cp scripts/pre-push.sh .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

### Dependabot não cria PRs
1. Verificar Settings > Security > Dependabot (todas ON)
2. Verificar `.github/dependabot.yml` está correto
3. Aguardar próximo agendamento (segunda-feira às 03:00 UTC)
4. Forçar via UI: Settings > Code security and analysis > Dependabot > Check for updates

### Security audit issue não é criado
1. Verificar se há vulnerabilidades: `pnpm audit`
2. Verificar permissions do GitHub Token (deve ser `issues: write`)
3. Verificar workflow logs: Actions > security-audit > último run

---

## 📚 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Pre-commit Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Turborepo Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [pnpm Lock File](https://pnpm.io/cli/install#lockfile)

---

## ✅ Status de Implementação

Todos os 6 itens da tarefa foram implementados:

1. ✅ GitHub Actions Type Check
2. ✅ GitHub Actions Build
3. ✅ GitHub Actions Security Audit
4. ✅ Dependabot Configuration
5. ✅ Pull Request Template
6. ✅ Pre-push Hook

**Arquivos criados:**
- `.github/workflows/type-check.yml`
- `.github/workflows/build.yml`
- `.github/workflows/security-audit.yml`
- `.github/dependabot.yml`
- `.github/pull_request_template.md`
- `scripts/pre-push.sh`
- `scripts/setup-hooks.sh`
- `.github/CI_CD_SETUP.md` (este arquivo)

**Arquivos modificados:**
- `package.json` (adicionados scripts `setup-hooks` e `postinstall`)

---

**Última atualização**: 2026-05-30
**Versão**: 1.0
