# Mobile App Submission - Quick Start Guide

**Última atualização:** 2026-05-28  
**App:** imbobi v1.0.0  
**Status:** Pronto para submissão

---

## ⚡ 30-Segundo Overview

O imbobi está **100% documentado e pronto** para submissão nas app stores.

| Plataforma | Status | Timeline | Documents |
|-----------|--------|----------|-----------|
| **iOS App Store** | ✅ Pronto | 3-7 dias | `IOS_SUBMISSION.md` |
| **Android Google Play** | ✅ Pronto | 1-3 dias | `ANDROID_SUBMISSION.md` |
| **Features & Permissions** | ✅ Documentado | N/A | `MOBILE_APP_FEATURES.md` |
| **Master Checklist** | ✅ Completo | N/A | `MOBILE_STORE_SUBMISSION.md` |

---

## 🚀 Próximos Passos (Ordem de Prioridade)

### Semana 1: Preparação (2-3 dias)

#### ✅ iOS (Paralelo)
```bash
1. [ ] Developer Account: https://developer.apple.com/account/
2. [ ] Create App ID: com.imbobi.app
3. [ ] Create Distribution Certificate
4. [ ] Create Provisioning Profile
5. [ ] Configure APNS (push notifications)
6. [ ] Create app record in App Store Connect
7. [ ] Upload screenshots + metadata (PT + EN)
8. [ ] Build: eas build --platform ios --type release --profile production
9. [ ] TestFlight: convite 10+ beta testers
10. [ ] Submit for review
```

**Tempo: ~2-3 horas setup + 2h build + 1h submissão = 5-6h**

#### ✅ Android (Paralelo)
```bash
1. [ ] Google Play Account: https://play.google.com/console
2. [ ] Generate Upload Key: keytool -genkey ...
3. [ ] Create Service Account (JSON)
4. [ ] Create app record in Google Play Console
5. [ ] Upload screenshots + metadata (PT + EN)
6. [ ] Complete content rating questionnaire
7. [ ] Set up data safety section
8. [ ] Build: eas build --platform android --type release --profile production
9. [ ] Google Play Beta: convite 10+ beta testers
10. [ ] Submit for review (via EAS ou Console)
```

**Tempo: ~2-3 horas setup + 2h build + 1h submissão = 5-6h**

### Semana 2: Review & Approval (1-7 dias)

```
iOS:     1-2 dias em queue, 24-48h review = 2-3 dias típico
Android: Imediato a 1 dia queue, automático ou 24-72h = 1-3 dias típico
```

---

## 📋 Checklist Essencial (antes de qualquer build)

### ✅ Versioning
```
app.config.ts:
  version: "1.0.0"
  ios.buildNumber: "1"
  android.versionCode: 1
```

### ✅ Assets (em `apps/mobile/assets/`)
```
- icon.png (1024x1024)
- splash.png (reescalado)
- adaptive-icon.png (Android)
```

### ✅ EAS Configuration
```bash
# eas.json preenchido com:
- ascAppId (para iOS)
- appleTeamId (para iOS)
- googleServiceAccount (para Android)
```

### ✅ Screenshots (5-8 por plataforma)
```
iOS:     1284 x 2778 px
Android: 1080 x 1920 px

Ordem: Login → Home → New Entry → Photo+GPS → Simulation → Notifications → [History/Settings]
```

### ✅ Metadata (Português + Inglês)
```
Descrição curta (80 chars)
Descrição completa (1500-4000 chars)
Keywords (finance, construction, GPS, etc)
Privacy Policy URL (https://imbobi.com/privacy-policy)
Support Email (contato.vinicaetano93@gmail.com)
```

### ✅ Privacy Policy
```
Deve estar online:
- Explain data collection (GPS, photos, CPF)
- Explain retention (24 meses)
- Explain user rights (delete, export)
- LGPD compliance
```

---

## 💾 Pre-Submission Checklist

Antes de fazer o primeiro build:

- [ ] `app.config.ts` versioning correto
- [ ] Assets presentes e corretos
- [ ] `eas.json` completamente preenchido
- [ ] Screenshots 5-8 para iOS (1284x2778)
- [ ] Screenshots 5-8 para Android (1080x1920)
- [ ] Descrição traduzida (PT-BR + EN)
- [ ] Privacy policy online e acessível
- [ ] Support email funcional
- [ ] Nenhum console error em dev
- [ ] TypeScript type-check passou
- [ ] Local production build testado
- [ ] TestFlight/Play Beta accounts preparadas

---

## 🔧 Build & Submit (Quick Commands)

### iOS
```bash
cd apps/mobile

# Build
eas build --platform ios --type release --profile production

# Monitorar
eas build:list

# Transporter (automático)
eas submit --platform ios --profile production

# Ou manual: Download .ipa → Transporter app → Deliver
```

### Android
```bash
cd apps/mobile

# Build (gera .aab - Android App Bundle)
eas build --platform android --type release --profile production

# Monitorar
eas build:list

# Submit (automático)
eas submit --platform android --profile production

# Ou manual: Download .aab → Google Play Console → Upload
```

---

## 📊 Timeline Esperado

```
PARALELO (iOS + Android):

Dia 1:  Setup contas + certs        (3-4 horas)
Dia 2:  Metadata + screenshots      (2-3 horas)
Dia 3:  Build                       (2-4 horas, 90% automático)
        TestFlight/Beta setup       (30 min)
        Initial testing             (1-2 horas)
Dia 4:  Submit for review           (30 min)

Dia 5-6: iOS review queue          (Apple process)
Dia 5:   Android auto-review        (Google automated)

Dia 6-9: Approval + Release         (if no issues)

TOTAL: 5-9 dias para ambas stores live
```

---

## 🚨 Problemas Comuns & Soluções

### Build Errors

| Erro | Solução |
|------|---------|
| "Provisioning profile expired" | Recriar em Developer Account |
| "Code signing failed" | Certs em Keychain, `eas credentials` |
| "Undefined symbols" | `pnpm install && pnpm db:generate` |
| "Keystore not found" | `eas credentials` → setup upload key |

### Rejection Reasons

| Razão | Solução |
|-------|---------|
| "Privacy policy broken" | Verificar URL é HTTPS + acessível |
| "App crashes on startup" | Testar em TestFlight, ver logs |
| "Unclear functionality" | Expandir screenshot descriptions |
| "Missing permission justification" | Adicionar em privacy policy |

---

## 📚 Full Documentation

Para detalhes completos:

| Doc | Para... |
|-----|---------|
| **MOBILE_STORE_SUBMISSION.md** | Visão geral completa, checklist master, timeline |
| **IOS_SUBMISSION.md** | Setup iOS, APNS, App Store Connect, TestFlight |
| **ANDROID_SUBMISSION.md** | Setup Android, upload key, Google Play, beta |
| **MOBILE_APP_FEATURES.md** | Features, permissions, justificativas LGPD |
| **MOBILE_SUBMISSION_QUICKSTART.md** | Este arquivo (resumo) |

---

## 🔐 Sensitive Data

**NUNCA commit:**
```
❌ google-play-key.json
❌ imbobi-upload.keystore
❌ .env files with API keys
```

**Armazenar em:**
```
✅ AWS Secrets Manager
✅ 1Password / LastPass
✅ GitHub Secrets (para CI/CD)
✅ Local encrypted storage
```

---

## 📞 Support

**Se tiver dúvidas:**
- Email: contato.vinicaetano93@gmail.com
- Docs: `/home/user/alagami-site/IOS_SUBMISSION.md` etc
- GitHub Issues: [alagami-site issues]

---

## ✨ Key Features (For Marketing)

**Highlight em store descriptions:**

1. **KYC Rápido** — Aprovado em segundos com biometria
2. **GPS Automático** — Cada foto tem localização garantida
3. **Simulação em Tempo Real** — Calcule limites e parcelas
4. **Offline-First** — Funciona sem internet (sincroniza depois)
5. **Seguro** — Criptografia end-to-end, LGPD compliant
6. **Notificações Push** — Receba updates em tempo real

---

## 🎯 Post-Submission Monitoring

Após submissão:

```
iOS App Store:
  → Check status in App Store Connect (status page)
  → Receber email se rejeitado
  → Monitor TestFlight feedback
  
Android Google Play:
  → Check status in Play Console (Release page)
  → Auto-review (usually instant)
  → Manual review if flagged
  → Monitor Play beta feedback
```

---

## 🔄 Updates & Maintenance

Após launch:

```
Hotfix (crash):
  1. Fix code
  2. Increment: buildNumber/versionCode
  3. Resubmit (demora reset ~24h)

Feature update:
  1. Increment: version (1.0.0 → 1.1.0)
  2. Build + submit (demora reset ~24h)

OTA updates (sem resubmit):
  eas update (apenas JS/assets, não native code)
```

---

## ✅ Final Checklist

Antes de começar:

- [ ] Leu `MOBILE_STORE_SUBMISSION.md` (overview)
- [ ] Leu `IOS_SUBMISSION.md` ou `ANDROID_SUBMISSION.md` (plataforma específica)
- [ ] Tem contas criadas (Apple Dev + Google Play Dev)
- [ ] Tem acesso a email principal (contato.vinicaetano93@gmail.com)
- [ ] Screenshots prontas
- [ ] Descrição traduzida (PT + EN)
- [ ] Privacy policy online
- [ ] Build local testado
- [ ] Notificações para começar!

---

**Versão:** 1.0.0  
**Última atualização:** 2026-05-28  
**Status:** ✅ PRONTO PARA SUBMISSÃO  
**Contato:** contato.vinicaetano93@gmail.com
