# Mobile App Store Submission - Complete Documentation Index

**Data:** 2026-05-28  
**App:** imbobi v1.0.0  
**Status:** ✅ **PRONTO PARA SUBMISSÃO**

---

## 📚 Documentação Completa

### 🚀 Comece aqui

**→ [`MOBILE_SUBMISSION_QUICKSTART.md`](./MOBILE_SUBMISSION_QUICKSTART.md)** (8 min read)
- 30-segundo overview
- Próximos passos prioritizados
- Checklist essencial pré-submissão
- Quick commands iOS + Android
- Timeline esperado (5-9 dias)

---

### 📱 iOS App Store (Específico)

**→ [`IOS_SUBMISSION.md`](./IOS_SUBMISSION.md)** (45 min read)
- **Seção 1:** Apple Developer setup (certs, identifiers)
- **Seção 2:** App Store Connect (create app record)
- **Seção 3:** Push Notifications (APNS configuration)
- **Seção 4:** Metadata & Screenshots (upload, review)
- **Seção 5:** Build process (EAS build)
- **Seção 6:** Submit for review (Transporter ou Xcode)
- **Seção 7:** TestFlight beta setup
- **Seção 8:** Troubleshooting guide

**Tempo total:** ~5-6 horas (setup + build + submit)

---

### 🤖 Android Google Play (Específico)

**→ [`ANDROID_SUBMISSION.md`](./ANDROID_SUBMISSION.md)** (50 min read)
- **Seção 1:** Google Play Console setup
- **Seção 2:** Generate Upload Key (keystore)
- **Seção 3:** Service Account (JSON para automação)
- **Seção 4:** App Listing & Metadata
- **Seção 5:** Screenshots & Assets
- **Seção 6:** Content Rating & Privacy (IARC)
- **Seção 7:** Build process (EAS build → AAB)
- **Seção 8:** Submit for review (EAS submit)
- **Seção 9:** Google Play Beta setup
- **Seção 10:** Troubleshooting guide

**Tempo total:** ~5-6 horas (setup + build + submit)

---

### 📋 Master Checklist & Overview

**→ [`MOBILE_STORE_SUBMISSION.md`](./MOBILE_STORE_SUBMISSION.md)** (60 min read)
- **Visão geral:** O que é necessário
- **Pré-requisitos:** Contas, ferramentas, credenciais
- **Checklist pré-submissão:** 50+ items
- **iOS completo:** Seções 1-7 (resumidas)
- **Android completo:** Seções 1-9 (resumidas)
- **Metadata & Content:** Features, permissions, justificativas
- **Testing & Beta:** TestFlight + Google Play beta
- **Timeline:** Quando esperar aprovação
- **Updates & Maintenance:** Como fazer updates depois

**Melhor para:** Visão 360° antes de começar qualquer coisa

---

### 🎯 Features & Permissions

**→ [`MOBILE_APP_FEATURES.md`](./MOBILE_APP_FEATURES.md)** (30 min read)
- **Feature 1: KYC** — Validação de identidade
  - O que faz, por que precisa, dados coletados
  - Permissões necessárias: câmera, galeria
  - Justificativa para reviewers
  
- **Feature 2: Geolocalização** — GPS validation
  - Validação em duas camadas (client + server)
  - Permissões: ACCESS_FINE_LOCATION (Android), Location When In Use (iOS)
  - Justificativa: Autenticidade de evidências
  
- **Feature 3: Câmera** — Captura de fotos
  - Integração nativa, compressão automática
  - Permissões: CAMERA, READ/WRITE_EXTERNAL_STORAGE
  
- **Feature 4: Simulação de Crédito** — Cálculo local
  - Sem permissões especiais
  - Cálculo local (seguro)
  
- **Feature 5: Push Notifications** — APNs + FCM
  - iOS: APNS certificate
  - Android: Firebase Cloud Messaging
  
- **Compliance:** LGPD, financial regulations
- **Data flow diagram:** Visual de tudo conectado
- **Runtime permissions:** Timing e user experience

---

## 📋 Quick Reference

### iOS Checklist
```
Setup:
  ☐ Developer account ($99)
  ☐ Create App ID (com.imbobi.app)
  ☐ Distribution certificate
  ☐ Provisioning profile
  ☐ APNS certificate (.p8 ou .pem)

App Store Connect:
  ☐ Create app record
  ☐ 5-8 screenshots (1284x2778)
  ☐ Description (PT + EN)
  ☐ Privacy policy URL
  ☐ Support email/website

Build & Submit:
  ☐ eas build --platform ios --type release
  ☐ TestFlight (10+ testers)
  ☐ eas submit ou Transporter

Timeline: 2-3 dias setup + 2h build + 24-48h review = 3-7 dias total
```

### Android Checklist
```
Setup:
  ☐ Play Developer account ($25)
  ☐ Upload key (keystore)
  ☐ Service account (JSON)
  ☐ Firebase/FCM configuration

Google Play Console:
  ☐ Create app record
  ☐ 5-8 screenshots (1080x1920)
  ☐ Description (PT + EN)
  ☐ Content rating questionnaire
  ☐ Privacy policy + data safety

Build & Submit:
  ☐ eas build --platform android --type release
  ☐ Google Play beta (10+ testers)
  ☐ eas submit ou console manual

Timeline: 2-3 dias setup + 2h build + 1-3 dias review = 1-6 dias total
```

---

## 🔄 Workflow Recomendado

### Dia 1-2: Setup (2-3 horas)

**Paralelo:**
```
iOS Track:
  1. Apple Developer account
  2. Create certs & provisioning
  3. Configure APNS
  4. Create ASC app record
  
Android Track:
  1. Google Play account
  2. Generate upload key
  3. Create service account
  4. Create Play app record
```

### Dia 3: Metadata (1-2 horas)

**Ambos:**
```
1. Prepare/optimize screenshots
2. Write descriptions (PT + EN)
3. Upload to both consoles
4. Review privacy policy
```

### Dia 4: Build & Beta (2-3 horas)

**Paralelo:**
```
iOS:
  1. eas build --platform ios --type release
  2. TestFlight: invite 10+ testers
  3. Basic QA (doesn't crash, features work)
  
Android:
  1. eas build --platform android --type release
  2. Play beta: invite 10+ testers
  3. Basic QA (same)
```

### Dia 5: Submit (30 min)

**Paralelo:**
```
iOS:
  eas submit --platform ios
  → Status via App Store Connect
  
Android:
  eas submit --platform android
  → Status via Google Play Console
```

### Dia 6-9: Waiting (0 action)

```
iOS:  "In Review" → 24-48h → "Ready for Sale"
      Se rejected, receber email → fix → resubmit (reset 24h)
      
Android: "In Review" → 1-24h → "Published"
         Auto-review (geralmente sem issues)
```

---

## 📊 Comparativo iOS vs Android

| Aspecto | iOS | Android |
|---------|-----|---------|
| **Setup Complexity** | Médio (certs) | Médio (keys + service account) |
| **Cost** | $99/ano | $25 one-time |
| **Build Time** | 2-4h | 2-4h |
| **Review Time** | 24-48h (pode ser 1-2 dias queue) | 1-3h (automático + eventual manual) |
| **Typical Approval** | 2-3 dias | 1 dia |
| **Resubmit Time** | Reset 24-48h | Reset 1-24h |
| **Common Rejections** | Privacy, crashes, misleading content | Less common, usually policy |
| **Beta Program** | TestFlight | Google Play beta + internal |
| **Max Testers** | 100 internal | 100 closed, 10k open |

---

## 🔐 Sensitive Data Management

**NUNCA commit ao repo:**
```
google-play-key.json        (EAS submit auth)
imbobi-upload.keystore      (signing key)
*.p8, *.pem                 (APNS certs)
.env com API keys           (hardcoded secrets)
```

**Armazenar em:**
```
AWS Secrets Manager
1Password / LastPass
GitHub Secrets (para CI/CD)
Local ~/.imbobi/secrets/ (gitignored)
```

**EAS CLI handles:**
```
eas credentials
→ EAS gerencia certs/keys de forma segura
→ Não expõe locally
→ Usa para build automático
```

---

## 🎯 Success Criteria

App é **100% pronto** quando:

- ✅ Todos 4 documentos lidos e entendidos
- ✅ Screenshots preparadas (5-8, correto tamanho)
- ✅ Descrição traduzida (PT-BR + EN)
- ✅ Privacy policy online
- ✅ Certs/keys generados e armazenados com segurança
- ✅ Local build testado (sem crashes)
- ✅ EAS build successful (ambas plataformas)
- ✅ TestFlight/beta testers confirmam nenhum crash
- ✅ Pronto para submissão paralela

---

## 📞 Troubleshooting Path

**Se algo der errado:**

1. **Que tipo de erro?**
   - Build error? → Ver `ANDROID_SUBMISSION.md` ou `IOS_SUBMISSION.md` seção "Troubleshooting"
   - Rejected? → Ver "Common Rejection Reasons"
   - Permission issue? → Ver `MOBILE_APP_FEATURES.md`

2. **Procurar em:**
   - Documentação (5-7 pages per platform)
   - EAS logs (`eas build:list`)
   - Console logs (Xcode/Android Studio)
   - App Store Connect / Google Play Console

3. **Se ainda não resolver:**
   - Email: contato.vinicaetano93@gmail.com
   - EAS support: https://expo.dev/help

---

## 📈 Post-Launch

Após ambas stores aprovadas:

1. **Monitor:** Check ratings, reviews, crash reports
2. **Iterate:** Coletar feedback via TestFlight/Play beta
3. **Hotfixes:** Se crítico, bump buildNumber, resubmit (demora reset ~24h)
4. **Updates:** Incrementar version (1.0.0 → 1.1.0), resubmit
5. **OTA:** Usar `eas update` para hotfixes JS-only

---

## 🔗 External Links

| Recurso | URL |
|---------|-----|
| Apple Developer | https://developer.apple.com/account/ |
| App Store Connect | https://appstoreconnect.apple.com |
| Google Play Console | https://play.google.com/console |
| Expo EAS Build | https://docs.expo.dev/build/introduction/ |
| Expo EAS Submit | https://docs.expo.dev/submit/introduction/ |

---

## ✨ Summary

Este repositório contém **tudo** necessário para submeter o imbobi nas duas maiores app stores do mundo.

**Documentação preparada:**
- ✅ MOBILE_SUBMISSION_QUICKSTART.md (start here)
- ✅ IOS_SUBMISSION.md (step-by-step)
- ✅ ANDROID_SUBMISSION.md (step-by-step)
- ✅ MOBILE_STORE_SUBMISSION.md (master overview)
- ✅ MOBILE_APP_FEATURES.md (permissions & compliance)
- ✅ Este arquivo (index)

**Versão:** 1.0.0  
**Build:** iOS #1, Android #1  
**Status:** 🚀 READY TO LAUNCH

---

**Próximo passo:** Abrir `MOBILE_SUBMISSION_QUICKSTART.md` e começar!

**Data:** 2026-05-28  
**Contato:** contato.vinicaetano93@gmail.com
