# iOS App Store Submission Guide - imbobi

**Versão:** 1.0.0  
**Build Number:** 1  
**Plataforma:** iOS 13.4+  
**Última atualização:** 2026-05-28

---

## Table of Contents

1. [Pré-requisitos](#pré-requisitos)
2. [Apple Developer Setup](#apple-developer-setup)
3. [Create App ID & Provisioning](#create-app-id--provisioning)
4. [Push Notifications (APNS)](#push-notifications-apns)
5. [App Store Connect Setup](#app-store-connect-setup)
6. [Metadata & Screenshots](#metadata--screenshots)
7. [Build Process](#build-process)
8. [Submit for Review](#submit-for-review)
9. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Contas & Memberships
- [x] Apple Developer Account ($99/ano)
  - URL: https://developer.apple.com/account/
- [x] Expo Account
  - URL: https://expo.dev/
- [x] macOS (opcional, mas recomendado)
  - Xcode 14+ instalado (`xcode-select --install`)

### Ferramentas
```bash
npm install -g eas-cli
eas login

# Verificar versão
eas --version
# deve ser >= 5.4.0
```

### Informações Necessárias
```
Apple Team ID:           (10 chars, numérico)
                         Encontrar em: Developer Account → Membership
                         
App Store Connect ID:    (obtido após criar app no ASC)

Bundle ID:               com.imbobi.app
                         (já configurado em app.config.ts)

App Name:                imbobi
Version:                 1.0.0
Build Number:            1 (incrementar a cada build)
```

---

## Apple Developer Setup

### 1. Certificados & Identifiers

**URL:** https://developer.apple.com/account/resources/certificates/list

#### 1a. Create App ID (Identifier)

1. Developer Account → Certificates, Identifiers & Profiles
2. Identifiers → +
3. Selecionar: **App ID** (não App Clip)
4. Preencher:
   ```
   Type: App ID
   Description: imbobi App
   Bundle ID: com.imbobi.app
   ```
5. Capabilities:
   ```
   ✓ Push Notifications
   ✓ Location Services (Background Location)
   ✓ Maps (se usar geolocalização com mapa)
   ```
6. Register

#### 1b. Create Distribution Certificate

Para submeter no App Store (não para TestFlight):

1. Certificates → +
2. Type: **Apple Distribution Certificate**
3. Follow prompt:
   - Download CSR from Mac (or generate if not on Mac)
   - Upload CSR
   - Download `.cer` file
4. Double-click `.cer` → Keychain automáticamente importa

**Salvar backup:**
```bash
# Exportar de Keychain
# Right-click on cert → Export
# Salvar como .p12 em local seguro
```

#### 1c. Create Provisioning Profile (App Store)

1. Provisioning Profiles → +
2. Type: **App Store Connect**
3. Select App ID: **com.imbobi.app**
4. Select Certificate: **distribuição que criou acima**
5. Download `.mobileprovision`
6. Salvar em:
   ```bash
   ~/Library/MobileDevice/Provisioning\ Profiles/
   ```

**Verificar:**
```bash
ls ~/Library/MobileDevice/Provisioning\ Profiles/ | grep imbobi
```

---

## Create App ID & Provisioning

### Já feito? Continuar para [Push Notifications](#push-notifications-apns)

Se ainda não criou:

**EAS pode ajudar:**
```bash
cd apps/mobile
eas credentials
# Seguir prompts para setup automático
```

---

## Push Notifications (APNS)

### Why Needed?
Enviar notificações push sobre:
- Aprovação de limite de crédito
- Liberação de parcelas
- Alertas de vencimento
- Atualizações de status de obra

### 1. Create APNS Certificate

**URL:** https://developer.apple.com/account/resources/identifiers/list

1. Identifiers → Selecionar `com.imbobi.app`
2. Capabilities → Push Notifications → Configure
3. Apple Push Notification service SSL Certificates
4. Create certificate (Development + Production)

**Development:**
```
1. Generate CSR (via Keychain Assistant no Mac)
2. Upload CSR
3. Download .cer
4. Double-click em Keychain
```

**Production:**
```
Mesmos passos
Importante: Este é para produção, não para TestFlight!
```

### 2. Export APNS Key

```bash
# Encontrar o certificado em Keychain
# Selecionar cert "Apple Push Services"
# Right-click → Export
# Salvar como imbobi-apns-prod.p12
# Definir senha simples

# Converter para .pem (se necessário para backend)
openssl pkcs12 -in imbobi-apns-prod.p12 -out imbobi-apns-prod.pem -nodes
```

### 3. Configure em Backend

**Armazenar em:**
- Environment variable (EC2, Render, etc)
- Secrets manager (AWS Secrets Manager, etc)
- Firebase Console (se usar FCM)

```
APNS_CERT_PATH: /path/to/imbobi-apns-prod.p12
APNS_CERT_PASSWORD: <sua_senha>
APNS_KEY_ID: <Key ID from Apple>
APNS_TEAM_ID: <Team ID from Apple>
```

### 4. Test APNS

```bash
# Testar token gerado no app durante KYC
# Enviar notificação de teste via backend

# Exemplo com curl (se backend support):
curl -X POST https://api.imbobi.com/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"deviceToken": "...", "title": "Test"}'
```

---

## App Store Connect Setup

### 1. Create App Record

**URL:** https://appstoreconnect.apple.com

1. My Apps → +
2. **New App**
3. Preencher:
   ```
   Platform: iOS
   Name: imbobi
   Bundle ID: com.imbobi.app
   SKU: com-imbobi-app (único, qualquer valor)
   User Access: Full Access (default)
   ```

### 2. App Information

1. App Store → App Information
2. Preencher:
   ```
   Subtitle:
   "Gerenciador de Obras com GPS"
   
   Privacy Policy URL:
   https://imbobi.com/privacy-policy
   
   Support Email:
   contato.vinicaetano93@gmail.com
   
   Support URL:
   https://imbobi.com/support
   ```

### 3. Pricing & Availability

1. Pricing & Availability tab
2. Configurar:
   ```
   Price Tier: Free
   Regions: Select all (default)
   Content Rights: "Yes" (confirma direitos autorais)
   Age Rating:
     Violence: None
     Scary/Horrifying: None
     Sexual: None
     Alcohol/Tobacco: None
     Final Rating: 4+ (default)
   ```

---

## Metadata & Screenshots

### 1. Prepare Screenshots

**Dimensões recomendadas:**

| Device | Resolution | Notes |
|--------|-----------|-------|
| iPhone 14 Pro Max | 1284 x 2778 | Topo da prioridade |
| iPhone 8 Plus | 1242 x 2208 | |
| iPad Pro 12.9" | 2048 x 2732 | Optional |

**Gerar via Simulator:**

```bash
# Abrir no Xcode
open -a Simulator

# Cmd+S para screenshot (salva em Desktop)
# Ou: Xcode → Window → Devices and Simulators

# Redimensionar (se necessário)
convert screenshot.png -resize 1284x2778 screenshot-resized.png
```

**Ordem sugerida (5 screenshots):**

1. **KYC/Login**
   - Tela inicial, login, CPF
   - Caption: "Cadastro rápido com validação de CPF"

2. **Dashboard/Home**
   - Home screen, histórico de obras
   - Caption: "Visualize todos seus registros em um só lugar"

3. **New Work Entry**
   - Tela para iniciar novo registro
   - Caption: "Registre novos projetos facilmente"

4. **Photo + GPS Validation**
   - Captura de foto com GPS ativado
   - Caption: "Fotos automáticamente georeferenciadas"

5. **Credit Simulation**
   - Tela de simulação de crédito
   - Caption: "Simule limites e parcelas em tempo real"

### 2. Upload Screenshots

**App Store Connect:**

1. App Store → Prepare for Submission
2. Screenshots → +
3. Selecionar device (iPhone 14 Pro Max, etc)
4. Drag-drop ou selecionar arquivo
5. Escrever Preview Text (até 170 chars):
   ```
   Português:
   "O imbobi valida sua presença via GPS e registra 
   evidências georeferenciadas de sua obra."
   ```

### 3. App Description

#### Português (até 4000 chars, mas manter breve ~1500)

```
imbobi - Seu Assistente de Obras

O imbobi é seu aliado digital para gerenciar obras 
e projetos com precisão. Cada foto é automaticamente 
marcada com GPS, garantindo autenticidade e rastreabilidade.

FUNCIONALIDADES PRINCIPAIS:

• Cadastro Simplificado (KYC)
  Validação de CPF e identidade em segundos
  Biometria para segurança

• Registros Georeferenciados
  GPS automático em cada foto
  Validação de presença no local
  Data/hora integrados

• Histórico Completo
  Acesso a todos seus registros
  Exportação de relatórios
  Busca e filtros avançados

• Simulação de Crédito
  Calcule limites em tempo real
  Flexibilidade em prazos
  Taxas competitivas

• Notificações em Tempo Real
  Alertas de aprovações
  Atualizações de status
  Lembretes de vencimentos

SEGURANÇA:
- Criptografia end-to-end
- Dados armazenados localmente quando offline
- Conformidade com LGPD e regulações financeiras

SUPORTE:
Dúvidas? Contate contato.vinicaetano93@gmail.com
```

#### English (até 4000 chars)

```
imbobi - Your Construction Assistant

imbobi is your digital partner for managing construction 
projects with precision. Every photo is automatically 
tagged with GPS, ensuring authenticity and traceability.

KEY FEATURES:

• Simplified Registration (KYC)
  CPF and identity validation in seconds
  Biometrics for security

• Geo-Tagged Records
  Automatic GPS on every photo
  Location presence validation
  Integrated date/time stamps

• Complete History
  Access all your records
  Export reports
  Advanced search and filters

• Credit Simulation
  Calculate limits in real-time
  Flexible payment terms
  Competitive rates

• Real-Time Notifications
  Approval alerts
  Status updates
  Payment reminders

SECURITY:
- End-to-end encryption
- Local data storage when offline
- LGPD and financial regulation compliance

SUPPORT:
Questions? Contact contato.vinicaetano93@gmail.com
```

### 4. Promotional Text (até 80 chars)

```
Português:
Registre obras com GPS em tempo real

English:
Real-time GPS job site tracking
```

### 5. Keywords (até 100 chars, separados por vírgula)

```
obra, construção, GPS, crédito, financiamento, imóvel,
construction, job site, geolocation, credit, financing
```

---

## Build Process

### 1. Configurar Versioning

**app.config.ts:**
```typescript
{
  version: "1.0.0",           // Sempre X.Y.Z (semver)
  ios: {
    buildNumber: "1",         // Incrementar a cada build
    bundleIdentifier: "com.imbobi.app"
  }
}
```

### 2. Build com EAS

```bash
cd apps/mobile

# Build para produção (App Store)
eas build --platform ios --type release --profile production

# Monitorar progresso
eas build:list
```

**Tempo esperado:** 2-4 horas

**Output:** Link para download do .ipa

### 3. Troubleshoot Build Errors

```bash
# Limpar cache se necessário
eas build:list --platform ios
eas build --platform ios --type release --profile production --clear-cache

# Ou forçar rebuild
eas build --platform ios --type release --profile production --no-cache
```

**Erros comuns:**

| Erro | Causa | Solução |
|------|-------|---------|
| "No provisioning profile" | Cert/profile expirado | Recriar em Developer Account |
| "Code signing failed" | Cert não em Keychain | Baixar .cer novamente, double-click |
| "Undefined symbols" | Missing dependencies | `pnpm install`, `pnpm db:generate` |

---

## Submit for Review

### 1. Download Build

1. Click link do build in `eas build:list`
2. Ou via Expo Dashboard → imbobi project → builds
3. Salvar `.ipa` localmente

### 2. Via Transporter (Recomendado)

**Instalação:**
```bash
# Transporter é app nativa macOS
# Download: App Store → Search "Transporter"
# Ou: https://apps.apple.com/us/app/transporter/id1450874784
```

**Processo:**
```
1. Abrir Transporter
2. Sign in com Apple ID (mesmo da Developer Account)
3. Drag-drop do .ipa na janela
4. Clique "Deliver"
5. Aguardar sucesso
```

### 3. Ou Via Xcode (Manual)

```bash
# Abrir Xcode
# Window → Devices and Simulators
# Right-click build → "Upload to App Store"
# Seguir prompts
```

### 4. Verificar Upload

**App Store Connect:**
1. App Store → Build → Select build
2. Verificar status: "Processing" → "Ready to Submit"
3. Demora ~5-10 minutos após upload

### 5. Submit for App Store Review

**App Store Connect:**

1. Prepare for Submission → All Information Complete?
2. Review all metadata:
   - [ ] Screenshots preenchidas
   - [ ] Description OK
   - [ ] Privacy policy acessível
   - [ ] APNS cert configurado
   - [ ] Build selecionado

3. Version Release:
   - Select "Manually release this version after review"
   - Ou "Automatically release this version after review"

4. Submit for Review
   - Botão azul bottom-right
   - Confirmar informações
   - **SUBMIT**

---

## After Submission

### 1. Monitor Review Status

**App Store Connect:**
- Status muda para "Waiting for Review"
- Depois "In Review" (Apple está analisando)
- Esperado: 1-2 dias

### 2. If Rejected

**Email com detalhes:**
- Ler feedback completo
- **Não é automático** - precisa ação

**Próximos passos:**
```bash
# Corrigir issue
# Incrementar buildNumber:
# app.config.ts: ios.buildNumber: "2"

# Novo build
eas build --platform ios --type release --profile production

# Resubmit
# (Demora reset a 24-48h)
```

### 3. If Approved

Status muda para "Ready for Sale"
- App está na App Store!
- Pode ser encontrado via busca
- Notificação por email

---

## TestFlight Setup (Beta)

### 1. Internal Testing (Seu Team)

**Automático no App Store Connect:**

1. TestFlight → Internal Testing
2. Adicionar testers (email address)
3. Eles recebem email com link TestFlight
4. Instalar app, testar, reportar feedback

### 2. External Testing (Public Beta)

1. TestFlight → External Testing
2. Create testing group
3. Adicionar até 10,000 testers via link público
4. Compartilhar link: `https://testflight.apple.com/...`

### 3. Managing Builds

```bash
# Cada build vai automático para Internal Testing
# Para External, após passar Internal por 24h

# No App Store Connect:
# TestFlight → Build → Choose for External Testing
```

---

## Privacy Policy & Data Handling

### Requirement
App Store rejeita apps sem privacy policy clara.

### Hosting
Necessário HTTPS link publicado:
```
https://imbobi.com/privacy-policy
```

### Conteúdo Mínimo (português)

```markdown
# Política de Privacidade - imbobi

**Data de Vigência:** 2026-05-28

## 1. Coleta de Dados

O imbobi coleta os seguintes dados:

### Dados de Localização (GPS)
- Coordenadas precisas (latitude/longitude)
- Utilidade: Validar presença do usuário na obra
- Retenção: 24 meses

### Dados de Identidade (KYC)
- CPF
- Nome completo
- Documento de identidade (foto)
- Utilidade: Conformidade regulatória, prevenção de fraude
- Retenção: Conforme legislação (LGPD)

### Dados de Mídia
- Fotos de obras
- Metadados (data, hora, GPS)
- Utilidade: Evidência georeferenciada
- Retenção: 24 meses ou conforme solicitado

### Dados Técnicos
- Device ID
- IP address
- User agent
- Utilidade: Segurança, analytics
- Retenção: 90 dias

## 2. Compartilhamento

- Não vendemos dados a terceiros
- Dados compartilhados apenas para:
  - Análise de crédito (parceiros financeiros)
  - Compliance (autoridades se obrigado)
  - Prestadores de serviço (AWS, etc)

## 3. Segurança

- Criptografia SSL/TLS em trânsito
- Criptografia em repouso (BD + storage)
- Acesso controlado por RBAC
- Auditorias regulares

## 4. Direitos do Usuário

- Direito de acesso aos seus dados
- Direito de correção
- Direito de exclusão ("right to be forgotten")
- Direito de portabilidade

**Para exercer direitos:** contato.vinicaetano93@gmail.com

## 5. Contato

Dúvidas sobre privacidade?
Email: contato.vinicaetano93@gmail.com
```

---

## Troubleshooting

### "App Rejected - Privacy Policy Issue"

**Causa comum:** URL quebrado ou política vaga

**Solução:**
1. Testar link manualmente em navegador
2. Certificar que é HTTPS (não HTTP)
3. Expandir seções de coleta de dados
4. Detalhar retenção de dados
5. Resubmeter com versão melhorada

### "Crash on Launch"

**Debug via TestFlight:**
1. TestFlight → Build → Device logs
2. Ou conectar device ao Xcode, rodar build localmente
3. Comum: Missing env vars (EAS_PROJECT_ID, API_URL)

```bash
# Verificar app.config.ts:
extra: {
  apiUrl: process.env["EXPO_PUBLIC_API_URL"],
  eas: { projectId: process.env["EAS_PROJECT_ID"] }
}

# Definir em eas.json se necessário
```

### "Provisioning Profile Expired"

**Timeline:**
- Development profile: 1 ano
- Distribution profile: 1 ano
- Refresh: Developer Account → Identifiers → Edit → Download novo

```bash
# Depois de download, place em:
~/Library/MobileDevice/Provisioning\ Profiles/
```

### "Undefined Symbols in Binary"

**Causa:** Dependência faltante

```bash
cd apps/mobile
pnpm install
pnpm db:generate
eas build --clear-cache
```

---

## Next Steps

1. ✅ Completar setup: Certs, Provisioning, APNS
2. ✅ Upload metadata (screenshots, description)
3. ✅ Build com EAS
4. ✅ TestFlight beta com 10+ testers
5. ✅ Submit for App Store review
6. ⏳ Aguardar aprovação (1-2 dias)
7. ✅ Monitor for rejection feedback
8. ✅ Release to customers

---

## Checklist Final

- [ ] Apple Developer Account ativo
- [ ] App ID criado (com APNS capability)
- [ ] Distribution cert em Keychain
- [ ] Provisioning profile baixado
- [ ] APNS cert exportado e armazenado
- [ ] App Store Connect app record criado
- [ ] Screenshots 5-8 preenchidas
- [ ] Description traduzida (PT + EN)
- [ ] Privacy policy online e acessível
- [ ] Build 1.0.0 criado com EAS
- [ ] TestFlight beta com feedback
- [ ] Submitted for review
- [ ] Status monitored no ASC

---

**Documento mantido por:** Desenvolvimento  
**Última atualização:** 2026-05-28  
**Contato:** contato.vinicaetano93@gmail.com
