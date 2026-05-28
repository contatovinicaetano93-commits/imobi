# Android Google Play Submission Guide - imbobi

**Versão:** 1.0.0  
**Version Code:** 1  
**Min SDK:** 24 (Android 7.0)  
**Target SDK:** 34 (Android 14)  
**Última atualização:** 2026-05-28

---

## Table of Contents

1. [Pré-requisitos](#pré-requisitos)
2. [Google Play Console Setup](#google-play-console-setup)
3. [Generate Upload Key](#generate-upload-key)
4. [Create Google Play Service Account](#create-google-play-service-account)
5. [App Listing & Metadata](#app-listing--metadata)
6. [Screenshots & Assets](#screenshots--assets)
7. [Content Rating & Privacy](#content-rating--privacy)
8. [Build Process](#build-process)
9. [Submit for Review](#submit-for-review)
10. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Contas & Registros
- [x] Google Play Developer Account ($25 one-time)
  - URL: https://play.google.com/console
- [x] Google Account (Gmail)
  - Email: contato.vinicaetano93@gmail.com
- [x] Expo Account
  - URL: https://expo.dev/

### Ferramentas
```bash
npm install -g eas-cli
eas login

# Verificar versão
eas --version
# deve ser >= 5.4.0

# Você também pode precisar de:
# keytool (incluído em Java/Android SDK)
# curl ou insomnia (testar APIs)
```

### Informações Necessárias
```
Package Name:          com.imbobi.app
App Title:             imbobi
Version Code:          1 (incrementar a cada build)
Version Name:          1.0.0 (vX.Y.Z)
Min SDK:               24 (Android 7.0)
Target SDK:            34 (Android 14)
```

---

## Google Play Console Setup

### 1. Criar Developer Account

**URL:** https://play.google.com/console

#### Passo a passo:
1. Sign in com Google Account (contato.vinicaetano93@gmail.com)
2. Accept developer agreement
3. Pagar $25 one-time fee (cartão de crédito)
4. Complete profile:
   - Developer name: "imbobi"
   - Developer email: contato.vinicaetano93@gmail.com
   - Developer phone: +55 11 9...
   - Website: https://imbobi.com

### 2. Create First App

1. Google Play Console → **Create app**
2. Preencher:
   ```
   App name: imbobi
   Default language: Português (Brasil)
   App type: Apps (não Games)
   Free/Paid: Free
   Content:
     - Violence: No
     - Sexual content: No
     - Alcohol/Tobacco: No
     - Final category: Finance/Business
   ```

### 3. Basic App Info

1. Setup → Basic app information
2. Preencher:
   ```
   Package name: com.imbobi.app
   App title: imbobi
   Short description: (máx 80 chars)
     "Registre obras com GPS em tempo real"
   
   Full description: [vide seção Screenshots & Assets]
   
   Category: Finance
   Content rating: 4+
   ```

---

## Generate Upload Key

**Importante:** Este é seu **upload key**, diferente do App Signing Key (gerado por Google).

### 1. Create Keystore

```bash
# Criar keystore (válido por 10,000 dias ~27 anos)
keytool -genkey -v \
  -keystore ~/keys/imbobi-upload.keystore \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -alias imbobi-upload \
  -storepass YOUR_SECURE_STORE_PASSWORD \
  -keypass YOUR_SECURE_KEY_PASSWORD

# Exemplo:
# storepass: MySecurePassword123!
# keypass: MySecureKeyPass456!
# (Guarde em 1Password ou similar)
```

### 2. Extract SHA-256 Fingerprint

```bash
keytool -list -v \
  -keystore ~/keys/imbobi-upload.keystore \
  -alias imbobi-upload \
  -storepass YOUR_SECURE_STORE_PASSWORD

# Output:
# Certificate fingerprints:
#          MD5:  ...
#          SHA1: ...
#          SHA-256: AB:CD:EF:12:34:...

# Copiar apenas SHA-256 (sem colons):
# ABCDEF1234...
```

### 3. Store Securely

```bash
# Proteger arquivo
chmod 600 ~/keys/imbobi-upload.keystore

# Backup em local seguro (não git!)
# Opções:
# - 1Password / LastPass
# - AWS Secrets Manager
# - HashiCorp Vault

# Nunca commitar keystore!
# Verificar .gitignore:
echo "~/keys/*.keystore" >> .gitignore
```

### 4. Configure EAS

**eas.json:**
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "aab",
        "withoutCredentials": false
      }
    }
  }
}
```

**Ou via EAS CLI:**
```bash
cd apps/mobile
eas credentials

# Seguir prompts:
# Platform: Android
# Profile: production
# Build type: AAB (Android App Bundle)
# Upload key: (Fornecer .keystore)
```

---

## Create Google Play Service Account

**Para submissão automática via EAS**

### 1. Google Cloud Setup

1. Google Cloud Console: https://console.cloud.google.com
2. Create project:
   ```
   Project name: imbobi-play-deploy
   ```
3. Selecionar projeto
4. Enable API: "Google Play Developer API"
   - URL: APIs & Services → Library
   - Search "Google Play"
   - Enable

### 2. Create Service Account

1. APIs & Services → Credentials
2. **Create Credentials** → Service Account
3. Preencher:
   ```
   Service account name: eas-submit
   Service account email: eas-submit@imbobi-play-deploy.iam.gserviceaccount.com
   ```
4. Grant roles:
   - `Service Account User`
   - `Service Account Admin`

### 3. Create JSON Key

1. Service Accounts → eas-submit@...
2. Keys → Add Key → Create new key
3. Key type: **JSON**
4. Download `eas-submit-key.json`

### 4. Prepare JSON Key

```bash
# Copiar para raiz do projeto
cp ~/Downloads/eas-submit-key.json \
  /home/user/alagami-site/google-play-key.json

# Proteger
chmod 600 /home/user/alagami-site/google-play-key.json

# Verificar conteúdo (nunca commitar!)
cat google-play-key.json | head -20
```

### 5. Link Service Account in Google Play Console

1. Google Play Console → Setup → Users and permissions
2. **Invite user**
3. Email: `eas-submit@imbobi-play-deploy.iam.gserviceaccount.com`
4. Role:
   - [ ] Admin (not needed)
   - [x] Finance
   - [x] Release manager
   - [ ] Viewer (not enough)
5. Save & invite

### 6. Update eas.json

```json
{
  "submit": {
    "production": {
      "android": {
        "googleServiceAccount": "./google-play-key.json",
        "androidPackage": "com.imbobi.app",
        "track": "production"
      }
    }
  }
}
```

---

## App Listing & Metadata

### 1. Create App Store Listing

**Google Play Console → Store listing**

#### 1a. Preview Info
```
Title: imbobi (deve corresponder ao app.config.ts)
Short description (80 chars máx):
"Registre obras com GPS em tempo real"

Full description (4000 chars máx):
[vide abaixo]
```

#### 1b. Full Description

**Português:**
```
imbobi - Gerenciador de Obras com GPS

O imbobi é seu assistente digital para gerenciar obras 
e projetos com precisão absoluta. Cada foto é 
automaticamente marcada com GPS, garantindo autenticidade 
e rastreabilidade total.

FUNCIONALIDADES:

📍 Geolocalização Automática
- GPS automático em cada foto
- Validação de presença no local
- Histórico completo de localização
- Funciona offline (sincroniza depois)

🪪 Cadastro Simplificado (KYC)
- Validação de CPF via API
- Autenticação com biometria
- Documento de identidade via foto
- Aprovação em segundos

📸 Registro de Evidências
- Câmera integrada com filtros
- Importação da galeria
- Compressão automática
- Metadados preservados

💳 Simulação de Crédito
- Cálculo em tempo real
- Múltiplas opções de prazos
- Taxas transparentes
- Sem compromisso

🔔 Notificações em Tempo Real
- Aprovação de limite
- Liberação de parcelas
- Alertas de vencimento
- Atualizações de status

📊 Relatórios & Análise
- Resumo mensal de obras
- Estatísticas de crédito
- Exportação em PDF
- Histórico detalhado

SEGURANÇA & PRIVACIDADE:
✓ Criptografia end-to-end
✓ Dados locais quando offline
✓ Conformidade LGPD
✓ Sem venda de dados a terceiros

PERMISSÕES:
O app solicita:
- Localização: Para validar presença
- Câmera: Para capturar evidências
- Galeria: Para importar fotos
- Armazenamento: Para cache local

SUPORTE:
Email: contato.vinicaetano93@gmail.com
Website: https://imbobi.com

DESENVOLVIDO COM:
React Native + Expo
Banco de dados: PostgreSQL
Servidor: NestJS + Fastify
```

**English:**
```
imbobi - Smart Job Site Manager

imbobi is your digital assistant for managing construction 
projects with absolute precision. Every photo is 
automatically geo-tagged, ensuring authenticity and 
complete traceability.

FEATURES:

📍 Automatic Geolocation
- GPS tagging on every photo
- On-site presence validation
- Complete location history
- Works offline (syncs later)

🪪 Simplified Registration (KYC)
- CPF validation via API
- Biometric authentication
- ID document via photo
- Approval in seconds

📸 Evidence Recording
- Built-in camera with filters
- Gallery import
- Automatic compression
- Metadata preserved

💳 Credit Simulation
- Real-time calculation
- Multiple payment options
- Transparent rates
- No commitment

🔔 Real-Time Notifications
- Limit approval alerts
- Installment release notifications
- Payment reminders
- Status updates

📊 Reports & Analytics
- Monthly work summary
- Credit statistics
- PDF export
- Detailed history

SECURITY & PRIVACY:
✓ End-to-end encryption
✓ Local data when offline
✓ LGPD compliance
✓ No data sales to third parties

PERMISSIONS:
The app requests:
- Location: Presence validation
- Camera: Evidence capture
- Gallery: Photo import
- Storage: Local caching

SUPPORT:
Email: contato.vinicaetano93@gmail.com
Website: https://imbobi.com

BUILT WITH:
React Native + Expo
Database: PostgreSQL
Server: NestJS + Fastify
```

#### 1c. Promotional Text (None)
```
Deixar em branco ou:
"Gerencie suas obras com GPS"
```

#### 1d. Category
```
Category: Finance
Content rating: Unrated (responda IARC depois)
```

---

## Screenshots & Assets

### 1. Prepare Screenshots

**Dimensões:**
```
Phone Portrait:  1080 x 1920 px (obrigatório)
Phone Landscape: 1920 x 1080 px (opcional)
Tablet:          1600 x 2560 px (opcional)
```

**Gerar:**

```bash
# Usar Android Emulator
# Android Studio → Device Manager → Create device
# Ou usar seu device Android

# Screenshot via adb:
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./

# Ou via UI do emulator/device
```

**Ordem sugerida (5-8):**

1. **Login Screen**
   - CPF input, "Login com CPF"
   - Caption: "Acesso rápido com CPF"

2. **Home Dashboard**
   - Card com última obra, status
   - Caption: "Visualize tudo em um lugar"

3. **New Work Entry**
   - Botão "Novo Registro"
   - Caption: "Inicie um novo projeto"

4. **Camera + GPS**
   - Câmera com GPS indicator "📍 Localização OK"
   - Caption: "Fotos automáticamente marcadas com GPS"

5. **Photo Upload Confirmation**
   - Foto enviada, GPS validado
   - Caption: "Evidências autenticadas"

6. **Credit Simulation**
   - Slider de valor, parcelas
   - Caption: "Simule crédito em tempo real"

7. **Notifications**
   - Tela de notificações push
   - Caption: "Receba atualizações em tempo real"

8. **History/Relatório**
   - Lista de registros com datas/localizações
   - Caption: "Histórico completo de suas obras"

### 2. Upload Screenshots

**Google Play Console:**

1. Store listing → Graphics
2. Screenshots → Add screenshots
3. Device type: Phone portrait (obrigatório)
4. Upload 5-8 imagens (1080x1920)
5. Preview text (opcional): descrição breve

### 3. App Icon

**Requisitos:**
```
Size: 512 x 512 px
Format: PNG
Safe zone: Círculo de 192px no centro
Sem transparência (fundo sólido)
Deve corresponder a assets/icon.png
```

**Está em:** `/home/user/alagami-site/apps/mobile/assets/icon.png`

**Verificar:**
```bash
identify apps/mobile/assets/icon.png
# Output: icon.png PNG 1024x1024 ...

# Se não tiver 512x512 versão:
convert apps/mobile/assets/icon.png -resize 512x512 icon-512.png
```

### 4. Feature Graphic

**Para destaques (opcional):**
```
Size: 1024 x 500 px
Format: PNG/JPG
Mostrar app em ação
Pode incluir texto promocional
```

---

## Content Rating & Privacy

### 1. Content Rating Questionnaire (IARC)

**Google Play Console → Política**

1. Setup → Content rating
2. Complete IARC questionnaire:
   ```
   Category: Finance
   
   Violência: Nenhuma
   Conteúdo sexual: Nenhum
   Temas adultos: Nenhum
   Tabageira/Álcool: Nenhum
   ```
3. Submit → Receber rating (4+, 12+, 16+, 18+)

**Esperado para imbobi: 4+ (sem conteúdo restrito)**

### 2. Privacy Policy

**Link necessário:**
```
https://imbobi.com/privacy-policy
```

**Deve incluir (português):**

```markdown
# Política de Privacidade - imbobi

## Dados Coletados

### Localização (GPS)
- Latitude e longitude
- Precisa estar ativada para validação de presença
- Armazenado 24 meses

### Identidade (KYC)
- CPF
- Nome
- Foto de documento
- Para conformidade regulatória

### Mídia
- Fotos da obra
- GPS anexado
- Armazenado conforme política de retenção

### Técnicos
- Device ID
- IP address
- User agent
- Para segurança

## Segurança

- Criptografia SSL/TLS em trânsito
- Criptografia em repouso
- Acesso via autenticação biométrica
- Auditoria de segurança anual

## Direitos

Você tem direito a:
- Acessar seus dados
- Corrigir informações
- Solicitar exclusão
- Exportar dados

Email para exercer direitos:
contato.vinicaetano93@gmail.com
```

### 3. Data Safety Section

**Google Play Console → Store listing → Data safety**

```
Data Collected:
✓ Location (GPS)
  - Retained: 24 months
  - Encrypted: Yes
  - User control: Can disable

✓ Photos/Media
  - Retained: 24 months
  - Encrypted: Yes
  - User control: Can delete

✓ Device identifiers
  - Retained: 90 days
  - Encrypted: Yes
  - User control: Cannot delete (needed for app function)

✓ Personal information (CPF, name)
  - Retained: As per LGPD (right to deletion after relationship ends)
  - Encrypted: Yes
  - User control: Can request deletion

Data Sharing:
- Data NOT shared with third parties
- Except: Payment processors, analytics (Google Analytics)
- No malware or spyware
- No permission to sell data

Compliance:
✓ Follows Google Play policy
✓ Complies with applicable laws
✓ LGPD compliant (Brazil)
```

---

## Build Process

### 1. Versioning Check

**app.config.ts:**
```typescript
android: {
  versionCode: 1,          // Incrementar a cada build
  package: "com.imbobi.app"
}
```

**package.json:**
```json
{
  "version": "1.0.0"       // Semver X.Y.Z
}
```

### 2. Build with EAS

```bash
cd apps/mobile

# Build para produção (AAB - Android App Bundle)
eas build --platform android --type release --profile production

# Monitorar progresso
eas build:list --platform android
```

**Tempo esperado:** 2-4 horas

**Output:** Download link do `.aab`

### 3. Troubleshoot

```bash
# Se falhar, tentar novamente com cache limpo
eas build --platform android --type release --profile production --clear-cache

# Ver logs
eas build:list --platform android
# Click no build ID para ver logs completos
```

**Erros comuns:**

| Erro | Causa | Solução |
|------|-------|---------|
| "Keystore not found" | google-play-key.json ou upload key | `eas credentials` → reconfigurar |
| "API error" | EAS account issue | `eas login` novamente |
| "Memory error" | Projeto grande | Tentar `--clear-cache` |

---

## Submit for Review

### 1. Option A: Via EAS CLI (Automático)

```bash
cd apps/mobile

eas submit --platform android --profile production

# Automáticamente:
# 1. Faz download do .aab
# 2. Faz upload para Google Play
# 3. Submete para review
# 4. Mostra status
```

### 2. Option B: Via Google Play Console (Manual)

1. Google Play Console → imbobi app
2. Release → Production
3. **Create new release**
4. Upload AAB:
   - Drag-drop do `.aab` ou
   - Download link do build EAS
5. Review informações:
   - [ ] Versão correta
   - [ ] Screenshots OK
   - [ ] Description OK
   - [ ] Privacy policy link OK
6. **Review and publish**

### 3. Verificar Status

```bash
# Via CLI
eas submit:list

# Via Console
# Google Play Console → Release → Production
# Status: "Sent for review" → "In review" → "Published"
```

---

## After Submission

### 1. Expected Timeline

```
Upload:          Imediato
Initial review:  Automático (minutos a horas)
Manual review:   Se necessário (24-72h)
Approval:        1-3 dias típico
Live:            Dentro de 2-3 horas após aprovação
```

### 2. Monitor Status

1. Google Play Console → Release → Production
2. Verificar "Review details"
3. Receber email se houver issue

### 3. If Rejected

**Email com motivo:**
```
Common reasons:
- Crash on startup
- Policy violation
- Inappropriate content
- Broken links
```

**Resposta:**
```bash
# Corrigir issue
# Incrementar versionCode:
# app.config.ts: versionCode: 2

# Novo build
eas build --platform android --type release --profile production

# Resubmit
eas submit --platform android --profile production
# (Timeline reset)
```

### 4. If Approved

Status muda para "Published"
```
- App visível no Google Play
- Busca funciona
- Disponível em todos os países configurados
- Notificação por email
```

---

## Google Play Beta Testing

### 1. Setup Internal Testing

```
Google Play Console → Release → Internal testing
```

1. Create new release
2. Upload .aab (mesmo do production, pode ser anterior)
3. Add testers (email addresses)
4. Eles recebem link TestFlight-like
5. Testam por mínimo 24h antes de poder fazer release

### 2. Setup Closed Beta

```
Google Play Console → Release → Closed testing
```

1. Create new release
2. Upload .aab
3. Add up to 100 testers
4. Compartilhar link de acesso
5. Recolher feedback
6. Depois de satisfeito, promove para Production

### 3. Testing Checklist

- [ ] App abre sem crash
- [ ] Login (CPF 11144477735 para teste)
- [ ] KYC flow completo
- [ ] Camera funciona
- [ ] GPS validado
- [ ] Credit simulation OK
- [ ] Push notifications chegam
- [ ] Logout/re-login
- [ ] Diferentes tamanhos de tela (phone + tablet)

---

## Troubleshooting

### "App crashes on startup"

**Debug:**
1. Testar em emulator (Android Studio)
2. Testar em device real
3. Verificar logs: `adb logcat | grep imbobi`

**Causas comuns:**
- Missing env vars (EXPO_PUBLIC_API_URL)
- Network error (offline, firewall)
- Device incompatibility (below minSdkVersion)

**Solução:**
```bash
# Verificar app.config.ts:
android: {
  minSdkVersion: 24,
  targetSdkVersion: 34
}

# Testar em Android 7.0+ device
```

### "Rejected: Insufficient privacy policy"

**Causa:** Policy vaga ou link quebrado

**Solução:**
1. Verificar link é HTTPS (não HTTP)
2. Detalhar seções de coleta
3. Adicionar contato para direitos LGPD
4. Resubmit com versão melhorada

### "Rejected: This app crashes on Android 10"

**Causa:** Permissão ou incompatibilidade

**Solução:**
1. Testar em Android 10 device/emulator
2. Ver logs completos
3. Atualizar dependências se necessário
4. Resubmit novo build

### "Cannot upload key — key rejected"

**Causa:** Upload keystore expirado ou inválido

**Solução:**
```bash
# Verificar validade
keytool -list -v -keystore ~/keys/imbobi-upload.keystore

# Se expirado (>10,000 dias atrás), criar novo:
keytool -genkey -v -keystore ~/keys/imbobi-upload-v2.keystore \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -alias imbobi-upload-v2

# Reconfigurar em EAS
eas credentials
```

---

## Next Steps

1. ✅ Create Google Play account
2. ✅ Create upload key (keystore)
3. ✅ Create service account + JSON
4. ✅ Create app record in Google Play Console
5. ✅ Prepare metadata (description, screenshots)
6. ✅ Content rating + privacy policy
7. ✅ Build com EAS
8. ✅ Test em device real
9. ✅ Submit para review
10. ⏳ Aguardar aprovação (1-3 dias)
11. ✅ Monitor for feedback
12. ✅ Release to customers

---

## Checklist Final

- [ ] Google Play account criado ($25 pago)
- [ ] Upload keystore gerado e protegido
- [ ] SHA-256 fingerprint documentado
- [ ] Service account criado + JSON
- [ ] Service account linked ao Google Play
- [ ] App record criado no Google Play
- [ ] Screenshots 5-8 preenchidas
- [ ] Description traduzida (PT + EN)
- [ ] Privacy policy online
- [ ] Content rating questionnaire completo
- [ ] Data safety seção preenchida
- [ ] Build 1.0.0 criado com EAS
- [ ] Build testado em device real (não emulator)
- [ ] Submitted for review via EAS ou Console
- [ ] Status monitored

---

**Documento mantido por:** Desenvolvimento  
**Última atualização:** 2026-05-28  
**Contato:** contato.vinicaetano93@gmail.com  
**GitHub:** [alagami-site](https://github.com/YOUR_ORG/alagami-site)
