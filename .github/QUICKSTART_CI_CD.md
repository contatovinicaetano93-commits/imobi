# 🚀 CI/CD Quick Start

## Tudo está pronto! Siga estes passos simples:

### 1️⃣ Habilitar GitHub Actions (1 minuto)

Vá para: **Settings > Actions > General**
- ✅ Marque "Actions is enabled"
- ✅ Selecione "Allow all actions and reusable workflows"
- ✅ Salve

### 2️⃣ Habilitar Dependabot (1 minuto)

Vá para: **Settings > Security > Dependabot**
- ✅ Habilite "Dependabot alerts"
- ✅ Habilite "Dependabot security updates"
- ✅ Habilite "Dependabot version updates"
- ✅ Salve

### 3️⃣ Instalar Pre-push Hook (instantâneo)

```bash
pnpm install
# Pronto! Hook instalado automaticamente
```

Ou manualmente:
```bash
pnpm run setup-hooks
```

---

## ✨ O que vai acontecer agora:

### 📍 Em cada Push/PR:
- ✅ Type-check automático
- ✅ Build automático
- ✅ Security audit (se modificar package.json)

### 📅 A cada segunda-feira (03:00 UTC):
- ✅ Dependabot cria PRs com atualizações
- ✅ Auto-merge para patch/minor (configurável)

### 🔒 A cada quinta-feira (02:00 UTC):
- ✅ Security audit completo
- ✅ Issues automáticas se vulnerabilidades

### 🚫 Antes de cada Push:
- ✅ Pre-push hook valida tipos localmente
- ✅ Bloqueia push com erros TypeScript

---

## 📝 PR Checklist

Próximas PRs terão checklist automático:
- [ ] Type-check passa
- [ ] Build passa
- [ ] Tests passam
- [ ] Security audit passa
- [ ] Sem dados sensíveis
- [ ] Documentação atualizada

---

## 🧪 Testar Localmente

```bash
# Type-check
pnpm type-check

# Build
pnpm build

# Security audit
pnpm audit

# Pre-push hook (cria um branch, faz erro intencional e tenta push)
git checkout -b test/pre-push
# ... faça uma mudança que quebra tipos ...
git add . && git commit -m "test"
git push  # Será bloqueado pelo hook ✓
```

---

## 📖 Documentação Completa

Veja `.github/CI_CD_SETUP.md` para mais detalhes sobre:
- Configuração avançada
- Troubleshooting
- Customização de workflows
- Referências

---

**Tempo total**: ~5 minutos
**Próximo passo**: Faça seu primeiro push para testar! 🎉
