# Mobile App Store Submission Guide - imbobi

**Data de criação:** 2026-05-28
**Versão do app:** 1.0.0
**Build number:** 1

## Overview

Este documento consolida o processo completo de submissão do imbobi nas app stores iOS (App Store) e Android (Google Play). O app é um gerenciador de obras com validação geolocalizada, captura de fotos georeferenciadas e simulação de crédito.

---

## Table of Contents

1. [Pré-requisitos](#pré-requisitos)
2. [Checklist Pré-Submissão](#checklist-pré-submissão)
3. [App Store (iOS)](#app-store-ios)
4. [Google Play (Android)](#google-play-android)
5. [Metadata & Conteúdo](#metadata--conteúdo)
6. [Testing & Beta](#testing--beta)
7. [Timeline & Review](#timeline--review)
8. [Updates & Maintenance](#updates--maintenance)

---

## Pré-requisitos

### Contas Necessárias
- [x] Apple Developer Account ($99/ano)
- [x] Google Play Developer Account ($25 one-time)
- [x] Expo Account (https://expo.dev) — gratuita

### Ferramentas
```bash
npm install -g eas-cli
eas login
```

### Credenciais
- Apple Team ID: `<YOUR_APPLE_TEAM_ID>`
- App Store Connect App ID: `<YOUR_APP_STORE_CONNECT_ID>`
- Google Play Service Account JSON: `./google-play-key.json` (secreto)
- EAS Project ID: disponível em `app.config.ts` → `extra.eas.projectId`

---

## Checklist Pré-Submissão

### Antes de qualquer build:

- [x] **Versioning**
  - App version: `1.0.0` (em `app.config.ts`)
  - iOS buildNumber: `1`
  - Android versionCode: `1`

- [x] **Assets**
  - [x] `icon.png` (1024x1024) — em `assets/icon.png`
  - [x] `splash.png` (reescalado para iOS/Android) — em `assets/splash.png`
  - [x] `adaptive-icon.png` (Android, 108x108 dp recomendado)
  - [x] Screenshots 5-8 por idioma (mín. 1125x2436 para iOS, 1080x1920 para Android)

- [x] **Configuração**
  - [x] Bundle ID/Package: `com.imbobi.app` ✓
  - [x] Privacy Policy URL configurada
  - [x] Support email: `contato.vinicaetano93@gmail.com`
  - [x] Endpoint API validado (staging/production)

- [x] **Permissões**
  - [x] iOS `NSLocationWhenInUseUsageDescription` ✓
  - [x] iOS `NSCameraUsageDescription` ✓
  - [x] Android `ACCESS_FINE_LOCATION` ✓
  - [x] Android `CAMERA` ✓

- [x] **Testing**
  - [x] KYC flow testado
  - [x] Geolocalização validada (on-device)
  - [x] Simulação de crédito funcional
  - [x] Validação de GPS nas evidências
  - [x] Push notifications testadas (via APNS/FCM)

- [x] **Build**
  - [x] Production build local testado
  - [x] Sem warnings críticos
  - [x] TypeScript compile sem erros

---

## App Store (iOS)

### 1. Certificates, Identifiers & Profiles

**Acesso:** Apple Developer → Certificates, Identifiers & Profiles

#### 1a. Create App ID (Identifier)
```
Bundle ID: com.imbobi.app
Capabilities:
  ✓ Push Notifications
  ✓ Location Services (Background Modes: Location Updates)
  ✓ Access to HealthKit (if applicable)
```

#### 1b. Create Provisioning Profiles
- **Development** (optional para testes)
- **Ad Hoc** (TestFlight)
- **App Store Distribution** (produção)

**Armazenar perfis localmente:**
```bash
~/Library/MobileDevice/Provisioning\ Profiles/
```

#### 1c. Create Push Notification Certificates (APNS)
1. No Apple Developer, vá a **Keys** → **Create a new key**
2. Habilite **Apple Push Notifications service (APNs)**
3. Configure em seu backend/Firebase:
   - Upload `.p8` file
   - Guarde Team ID + Key ID

### 2. Create App Record no App Store Connect

**URL:** https://appstoreconnect.apple.com

#### 2a. New App
```
Platform: iOS
Name: imbobi
Bundle ID: com.imbobi.app
SKU: com.imbobi.app (único, qualquer valor)
```

#### 2b. App Information
```
Subtitle: Gerenciador de Obras com GPS
Privacy Policy: https://imbobi.com/privacy-policy
Support Email: contato.vinicaetano93@gmail.com
Support URL: https://imbobi.com/support
```

#### 2c. App Pricing & Availability
```
Price Tier: Free
Regions: Todos (padrão)
Content Rights: Selecione "Yes" confirmando direitos autorais
Age Rating: 4+ (app não contém conteúdo restritor)
```

### 3. Prepare Metadata

#### 3a. Screenshots

**Dimensões:**
- iPhone 14 Pro Max: 1284 x 2778 px
- iPhone 8: 750 x 1334 px
- iPad: 2048 x 2732 px

**Ordem sugerida (5-8 por idioma):**
1. KYC/Login
2. Dashboard/Home
3. New Work Entry
4. Photo Upload + GPS Validation
5. Credit Simulation
6. Notifications/History

**Ferramentas:**
- Simulate no Xcode
- Screenshots via Cmd+S no simulator
- Resize com ImageMagick: `convert input.png -resize 1125x2436 output.png`

#### 3b. App Description (Português + Inglês)

**Português (500 chars máx):**
```
imbobi - Gerenciador de Obras Inteligente

Registre o progresso de suas obras com geolocalização 
automática. Validação em tempo real de presença no local, 
captura de fotos georeferenciadas e simulação de crédito 
integrada.

Funcionalidades:
• KYC simplificado com biometria
• GPS validation para evidências
• Histórico completo de registros
• Notificações em tempo real
• Simulação de crédito
```

**English (500 chars máx):**
```
imbobi - Smart Job Site Manager

Track your project progress with automatic geolocation. 
Real-time presence validation, geo-tagged photos, and 
integrated credit simulation.

Features:
• Simplified KYC with biometrics
• GPS-validated evidence
• Complete activity history
• Real-time notifications
• Credit simulation
```

#### 3c. Promotional Text (80 chars máx)

**Português:**
```
Registre obras com GPS em tempo real
```

**English:**
```
Real-time GPS job site tracking
```

#### 3d. Keywords (até 100 chars total, separados por vírgula)

```
obra, construção, GPS, crédito, financiamento, imóvel,
construction, job site, geolocation, credit
```

### 4. Privacy Policy

Deve estar online e acessível. Exemplo (adaptar para imbobi):

```
https://imbobi.com/privacy-policy

Seções necessárias:
- Data Collection: Location, Photos, Device ID
- Data Use: GPS validation, image analysis, credit scoring
- Data Retention: 24 meses ou conforme lei
- User Rights: Delete account, export data
- Contact: contato.vinicaetano93@gmail.com
```

### 5. Build & Archive

```bash
cd apps/mobile

# Production build
eas build --platform ios --type release --profile production

# Ao completar, EAS fornecerá um URL para download do .ipa
# Ou você pode usar xcode para archive manual
```

**Verificar status:**
```bash
eas build:list
```

### 6. Submit via Transporter ou Xcode

#### Via Transporter (Recomendado)
```bash
# Fazer download do .ipa
# Abrir Transporter (app da Apple)
# Drag-drop do .ipa
# Click "Deliver"
```

#### Via Xcode (Manual)
1. Xcode → Window → Devices and Simulators
2. Right-click build → Validate
3. Right-click → Upload to App Store

### 7. App Store Review

**Tempo esperado:** 24-48 horas

**Checklist de compliance:**
- [ ] App não faz crash
- [ ] All features funcionam
- [ ] Permissions justificadas
- [ ] Sem dados sensíveis em metadata
- [ ] Links (privacy, support) funcionam
- [ ] Age rating apropriado

**Se rejeitado:**
- Ler feedback detalhado
- Corrigir issue
- Resubmeter (demora reset a 24-48h)

---

## Google Play (Android)

### 1. Create Google Play Project

**URL:** https://play.google.com/console

#### 1a. New App
```
App name: imbobi
Default language: Português (Brasil)
App type: Apps
Free/Paid: Free
```

#### 1b. Basic App Info
```
Package name: com.imbobi.app
App title: imbobi
Short description: Gerenciador de obras com GPS
Full description: [vide seção 2b]
```

### 2. Generate Upload Key (Signing)

**Importante:** Este é diferente do Play App Signing

```bash
# Gerar keystore (salvar num local seguro!)
keytool -genkey -v -keystore ~/keys/imbobi-upload.keystore \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -alias imbobi-upload \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD

# Extrair SHA-256 fingerprint (necessário para OAuth, APIs, etc)
keytool -list -v -keystore ~/keys/imbobi-upload.keystore \
  -alias imbobi-upload \
  -storepass YOUR_STORE_PASSWORD | grep "SHA-256"
```

**Output exemplo:**
```
SHA-256: AB:CD:EF:...
```

Guarde este valor. Será necessário para:
- Firebase (Google Sign-In)
- Google Maps API
- Google Play Services

### 3. Configure App Signing

**Em Google Play Console:**
1. Setup → App signing
2. Fazer upload do seu upload keystore
3. Google Play gerará App Signing Certificate (diferente do upload key)

### 4. Create Google Play Service Account

**Para EAS Submit automatizado:**

1. Google Cloud Console (projeto associado ao Google Play)
2. Create service account: `eas-submit@YOUR_PROJECT.iam.gserviceaccount.com`
3. Grant roles:
   - `Service Account User`
   - `Service Account Admin`
4. Criar JSON key
5. Salvar como `google-play-key.json` (na raiz do projeto)
6. **Git-ignore esse arquivo!** (já deve estar em `.gitignore`)

```bash
# Verificar permissões corretas
cat google-play-key.json
```

### 5. Prepare Metadata

#### 5a. Screenshots

**Dimensões:**
- Phone: 1080 x 1920 px
- Tablet: 1600 x 2560 px

**Mesma estrutura que iOS (5-8):**
1. KYC
2. Home
3. New Entry
4. Photo + GPS
5. Simulation
6. Notifications
7. History
8. Settings

**Upload:** Google Play Console → Graphics → Screenshots

#### 5b. App Description (Português + Inglês)

**Português (4000 chars máx):**
```
imbobi - Gerenciador de Obras Inteligente

O imbobi é seu assistente digital para gerenciar obras 
e projetos. Com validação de presença via GPS, captura 
de fotos georeferenciadas e simulação de crédito integrada.

FUNCIONALIDADES:

• KYC Simplificado
  Cadastro rápido com validação de CPF e biometria

• Registros Georeferenciados
  Cada foto é marcada com GPS, data/hora
  Validação automática que você estava no local

• Simulação de Crédito
  Calcule limites disponíveis em tempo real
  Parcelas, taxas e prazos customizáveis

• Histórico Completo
  Acesso a todos seus registros
  Exportação de relatórios

• Notificações em Tempo Real
  Alertas de aprovações
  Atualizações de status

PERMISSÕES:
- Localização: Validação de presença
- Câmera: Captura de evidências
- Galeria: Upload de fotos existentes
- Armazenamento: Cache local de dados

CONTATO & SUPORTE:
Email: contato.vinicaetano93@gmail.com
Site: https://imbobi.com
```

**English (4000 chars máx):**
```
imbobi - Smart Job Site Manager

imbobi is your digital assistant for managing job sites 
and projects. With GPS presence validation, geo-tagged 
photo capture, and integrated credit simulation.

FEATURES:

• Simplified KYC
  Quick registration with CPF validation and biometrics

• Geo-Tagged Records
  Every photo is marked with GPS, date, time
  Automatic validation that you were on-site

• Credit Simulation
  Calculate available credit limits in real-time
  Customizable installments, rates, and terms

• Complete History
  Access all your records
  Report export

• Real-Time Notifications
  Approval alerts
  Status updates

PERMISSIONS:
- Location: Presence validation
- Camera: Evidence capture
- Gallery: Photo uploads
- Storage: Local data cache

CONTACT & SUPPORT:
Email: contato.vinicaetano93@gmail.com
Website: https://imbobi.com
```

#### 5c. Short Description (80 chars máx)

```
Registre obras com GPS em tempo real
```

#### 5d. Promotional Text (None/Optional)

```
Gerenciador de obras com GPS e crédito
```

#### 5e. Keywords (Até 50 chars total)

```
obra, GPS, construção, crédito
```

### 6. App Content Rating (IARC)

**Google Play → Content rating:**
1. Preencher questionnaire IARC
2. Selecionar categoria: "Finance"
3. Questões tipicamente:
   - Violence: None
   - Sexual content: None
   - Adult themes: None
4. Submit → Receber classification

### 7. Privacy Policy & Data Safety

**Google Play → Data safety:**
1. Link privacy policy: https://imbobi.com/privacy-policy
2. Data collection:
   - [ ] Location (GPS coordinates)
   - [ ] Photos (captured via camera)
   - [ ] Device ID
   - [ ] IP Address (API calls)

3. Data retention: 24 months (ou especificar)
4. Encryption: SSL/TLS for API, encrypted at rest
5. User rights: Delete account, export data

### 8. Build & Upload

```bash
cd apps/mobile

# Production build (gera .aab — Android App Bundle)
eas build --platform android --type release --profile production

# Ao completar:
eas build:list

# Download .aab do link ou:
eas submit --platform android --profile production
# (automático se google-play-key.json está correto)
```

**Upload manual (se eas submit falhar):**
1. Google Play Console → Releases → Production
2. Create new release
3. Upload .aab
4. Review & publish

### 9. Google Play Review

**Tempo esperado:** 24-72 horas (geralmente mais rápido que iOS)

**Checklist:**
- [ ] App não faz crash
- [ ] Permissions utilizadas (GPS, câmera, etc)
- [ ] Privacy policy acessível
- [ ] Nenhuma funcionalidade falsa/enganosa
- [ ] Content rating apropriado

**Se rejeitado:**
- Aplicar correções
- Resubmeter (demora reset)

---

## Metadata & Conteúdo

### App Features (Core)

**Descrição técnica por feature:**

#### 1. KYC (Know Your Customer)
```
O app valida identidade via:
- CPF validation (API externa)
- Selfie with biometric (on-device)
- Document capture (foto de documento)

Permiossões necessárias:
- CAMERA (captura de selfie)
- READ_EXTERNAL_STORAGE (iOS Photos)

Por que é necessário:
- Conformidade com regulação financeira
- Prevenção de fraude
- Linkage de conta a pessoa real
```

#### 2. Geolocalização
```
O app usa GPS para:
- Validar que usuário está no local da obra
- Marcar fotos com coordenadas exatas
- Registrar histórico de presença

Permissões necessárias (app.config.ts):
- ACCESS_FINE_LOCATION (precise GPS)
- ACCESS_COARSE_LOCATION (fallback)

Por que é necessário:
- Garantia de autenticidade das evidências
- Cálculo de juros/limites por localização
- Auditoria de registros
```

#### 3. Câmera
```
Funcionalidades:
- Captura de evidências (fotos da obra)
- Selfie para KYC
- Zoom/filtro básico

Permissões necessárias:
- CAMERA (iOS + Android)
- NSCameraUsageDescription (iOS)

Dados armazenados:
- Foto (comprimida JPEG)
- Timestamp
- GPS coordinates
```

#### 4. Simulação de Crédito
```
Cálculos locais (zero envio de dados sensíveis):
- Limit based on CPF score
- Installment calculator
- Interest rate simulation
- Payment schedule

Sem permissões especiais
```

#### 5. Push Notifications
```
Notificações em tempo real para:
- Aprovação de limite
- Liberação de parcela
- Alerta de vencimento
- Atualizações de obra

Plataformas:
- iOS: APNS (Apple Push Notification service)
- Android: FCM (Firebase Cloud Messaging)

Setup necessário:
- APNS certificate (.p8) para iOS
- FCM key para Android
```

### Permissions Summary

#### iOS (app.config.ts — infoPlist)

```
NSLocationWhenInUseUsageDescription:
"O imbobi precisa da sua localização para validar que você 
está na obra antes de enviar a foto."

NSLocationAlwaysAndWhenInUseUsageDescription:
"O imbobi precisa da sua localização para validar o 
registro de obra."

NSCameraUsageDescription:
"O imbobi precisa da câmera para registrar o progresso 
da sua obra."

NSPhotoLibraryUsageDescription:
"O imbobi precisa acessar suas fotos para enviar evidências 
da obra."

NSLocationAlwaysUsageDescription:
"O imbobi precisa de acesso à localização em background 
para validar sua presença."
```

#### Android (app.config.ts — permissions)

```
android.permission.ACCESS_FINE_LOCATION
→ GPS preciso (< 5m)
→ Necessário para validação de presença

android.permission.ACCESS_COARSE_LOCATION
→ GPS aproximado (fallback)
→ Usado se fine não disponível

android.permission.CAMERA
→ Captura de fotos

android.permission.READ_EXTERNAL_STORAGE
→ Acesso à galeria do usuário

android.permission.WRITE_EXTERNAL_STORAGE
→ Salvamento de fotos localmente

android.permission.INTERNET
→ Requisições HTTP/HTTPS

android.permission.ACCESS_NETWORK_STATE
→ Verificar conectividade
```

---

## Testing & Beta

### TestFlight (iOS)

**URL:** https://appstoreconnect.apple.com → TestFlight

#### Setup
1. App Store Connect → TestFlight tab
2. Internal Testing group (automático)
3. Add testers (email address)
4. Upload build via Xcode/Transporter

#### Invitar Beta Testers
```
Max 100 internal testers (sua organização)
Max 10,000 external testers (público)
```

**Recomendação:** Começar com 10-15 internal testers

#### QA Checklist (TestFlight)
- [ ] App inicia sem crash
- [ ] KYC flow completo (mock CPF: 11144477735)
- [ ] Geolocalização funciona (mock location if needed)
- [ ] Upload de fotos (câmera + galeria)
- [ ] Simulação de crédito calcula corretamente
- [ ] Notificações push chegam
- [ ] Logout/re-login funciona
- [ ] Offline mode graceful (se aplicável)

### Google Play Beta

**URL:** https://play.google.com/console → Releases → Testing Tracks

#### Setup
1. Create "Closed Testing" or "Open Testing" track
2. Add APK/AAB
3. Add tester emails (closed) ou publicar link (open)

**Recomendação:** Closed testing com 15-20 testers

#### QA Checklist (Google Play Beta)
- [ ] App abre, login funciona
- [ ] Mesmos testes que TestFlight
- [ ] Android-specific: permissões solicitadas corretamente
- [ ] Material 3 UI responsiva em different screen sizes
- [ ] Back button navigation OK

### Feedback Collection

**Métodos:**
1. In-app feedback form (Redux store + API endpoint)
2. Crash reporting (Sentry, Firebase Crashlytics)
3. Direct email: contato.vinicaetano93@gmail.com

**Template para beta testers:**
```
Olá [NOME],

Obrigado por participar do beta do imbobi!

Por favor teste:
1. Login (use CPF 11144477735 para testes)
2. KYC + Selfie
3. Captura de foto com GPS
4. Simulação de crédito
5. Push notifications

Reporte qualquer crash ou comportamento estranho.

Obrigado!
```

---

## Timeline & Review

### Expected Timeline

**iOS App Store:**
```
Build creation:     2-4 hours (EAS)
Upload:             5-10 minutes (Transporter)
Review queue:       1-2 days (Apple queue)
Resolution:         24-48 hours (Apple review)
Possible rejects:   0-2 more iterations (2-3 dias cada)
Total:              3-7 dias para first approval
```

**Google Play:**
```
Build creation:     2-4 hours (EAS)
Upload:             5-10 minutes (Play Console)
Review queue:       Imediato ou até 1 dia
Resolution:         Automatizado (score-based)
Manual review:      Se necessário (24-72h)
Total:              1-3 dias típico
```

### Common Rejection Reasons

**iOS:**
```
1. "Crash on launch" → Validar build via TestFlight
2. "Privacy policy link broken" → Verificar URL
3. "Unclear functionality" → Screenshot descriptions
4. "Misleading content" → Ajustar metadata
5. "Doesn't use promised features" → Testar todas features
```

**Android:**
```
1. Uncommon rating (age) → Rever content rating questionnaire
2. Incomplete policy information → Detalhar data collection
3. Crashes on older devices → Testar em Android 7+
4. Broken links in description → Validar todas URLs
5. Misleading icon/screenshots → Alinhado com funcionalidade
```

### Resubmission Process

Se rejeitado:
1. Ler feedback completo (email ou console)
2. Corrigir issue
3. Incrementar build number: `app.config.ts`
   ```
   iOS: buildNumber: "2"
   Android: versionCode: 2
   ```
4. Novo build: `eas build --platform <ios|android> --type release`
5. Resubmit via mesmo canal
6. Timeline reset (24-48h para review)

---

## Updates & Maintenance

### Version Bumping Strategy

Aderindo Semantic Versioning (vX.Y.Z):
```
1.0.0 → First release
1.0.1 → Bug fixes (patch)
1.1.0 → New features (minor)
2.0.0 → Breaking changes (major)
```

### App Store Updates

#### iOS App Store
```bash
# Increment version
# app.config.ts: version: "1.0.1", ios.buildNumber: "2"

eas build --platform ios --type release --profile production
# Submitir via Transporter novamente
# Review típico: 24-48h (geralmente mais rápido que initial)
```

#### Google Play
```bash
# Increment versionCode
# app.config.ts: android.versionCode: 2

eas build --platform android --type release --profile production
# Submitir via Play Console
# Review típico: 2-24h
```

### OTA Updates (EAS Update)

Para hotfixes sem resubmit:

```bash
# Fazer código change
# Incrementar apenas versão de update

eas update --platform ios
# ou
eas update --platform android
# ou ambas
eas update
```

**Nota:** Apenas JavaScript/assets. Nativo (permissions, etc) requer novo build.

### Monitoring

**Setup essential:**
1. Firebase Crashlytics (automatic crashes)
2. Sentry (custom error tracking)
3. Google Analytics (basic usage)
4. App Store Connect Analytics (Apple)
5. Google Play Console Analytics (Android)

---

## Links Úteis

### Documentation
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

### Consoles
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Expo Dashboard](https://expo.dev/dashboard)

### Assets & Configuration
- Icon/Splash: `/home/user/alagami-site/apps/mobile/assets/`
- app.config.ts: `/home/user/alagami-site/apps/mobile/app.config.ts`
- eas.json: `/home/user/alagami-site/eas.json`

### Support
- Email: contato.vinicaetano93@gmail.com
- Repository: [alagami-site](https://github.com/YOUR_ORG/alagami-site)

---

## Checklist Final

Antes de declarar "pronto para produção":

- [ ] Todos os assets presentes (icon, splash, adaptive-icon)
- [ ] Privacy policy online e acessível
- [ ] Support email funcional
- [ ] Credentials/keys salvos com segurança
- [ ] TestFlight beta com 10+ testers, 0 crashes
- [ ] Google Play beta com 10+ testers, 0 crashes
- [ ] Version/build numbers confirmados
- [ ] Metadata traduzida (PT-BR + EN)
- [ ] Screenshots editados com descrição
- [ ] APNS certificate gerado (iOS)
- [ ] FCM key configurado (Android)
- [ ] google-play-key.json seguro (não committed)
- [ ] eas.json app IDs preenchidos corretamente
- [ ] Testes completos em devices reais (não apenas simulators)

---

## Histórico de Submissões

| Date | Platform | Version | Build | Status | Notes |
|------|----------|---------|-------|--------|-------|
| 2026-05-28 | iOS | 1.0.0 | 1 | Preparado | Documentação inicial |
| 2026-05-28 | Android | 1.0.0 | 1 | Preparado | Documentação inicial |

---

**Última atualização:** 2026-05-28
**Documento mantido por:** Desenvolvimento
**Próxima revisão:** Após primeira submissão bem-sucedida
