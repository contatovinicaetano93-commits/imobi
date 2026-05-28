# Mobile App Features & Permissions Documentation

**App:** imbobi v1.0.0  
**Data:** 2026-05-28  
**Plataformas:** iOS 13.4+ | Android 7.0+ (SDK 24)

---

## App Features Overview

### 1. KYC (Know Your Customer)

**Propósito:** Validação de identidade do usuário para conformidade regulatória e prevenção de fraude.

**Fluxo:**
```
Login com CPF
  ↓
Validação de CPF (API)
  ↓
Captura de Selfie (câmera + biometria)
  ↓
Upload de documento (câmera ou galeria)
  ↓
Análise (backend)
  ↓
Aprovação/Rejeição
```

**Dados coletados:**
- CPF (validado via API)
- Nome completo
- Foto de rosto (selfie)
- Foto de documento (frente + verso)
- Email
- Telefone

**Retenção:** Conforme LGPD (24 meses ou conforme relacionamento)

**Permissões necessárias:**
- ✓ Câmera (selfie + documento)
- ✓ Galeria/Galeria de fotos (se usuário escolher foto existente)

**Por que necessário:**
- Conformidade regulatória brasileira
- Prevenção de lavagem de dinheiro (AML)
- Linkage de conta a pessoa real
- Rastreabilidade para auditoria

**Privacy considerations:**
- Dados enviados via SSL/TLS
- Armazenado criptografado no backend
- Não compartilhado com terceiros não-autorizados
- Acesso restrito a staff com NDA

---

### 2. Geolocalização (GPS)

**Propósito:** Validar que usuário está na localização da obra antes de aceitar fotos como evidência.

**Funcionalidades:**
- GPS automático em cada foto
- Validação: "Você está no local da obra?"
- Histórico de localizações visitadas
- Mapa com pins das obras

**Dados coletados:**
- Latitude + Longitude (precisa ~5m)
- Timestamp
- Altitude (opcional)
- Velocidade (para detectar spoofing)

**Retenção:** 24 meses

**Permissões necessárias:**

| Sistema | Permissão | iOS Term | Android Term |
|---------|-----------|----------|--------------|
| iOS | Location When In Use | NSLocationWhenInUseUsageDescription | N/A |
| iOS | Background Location | NSLocationAlwaysAndWhenInUseUsageDescription | N/A |
| Android | Fine Location | ACCESS_FINE_LOCATION | Preciso (~5m) |
| Android | Coarse Location | ACCESS_COARSE_LOCATION | Aproximado (fallback) |

**Por que necessário:**
- **Autenticidade:** Prova que foto foi tirada no local real
- **Fraude prevention:** Impossível enviar fotos de outro lugar
- **Auditoria:** Histórico geográfico das obras
- **Cálculo de juros:** Taxa pode variar por região

**Validação em duas camadas:**
```
Client-side (UX):
  → Verificar se GPS está ativado
  → Mostrar "Localização OK" ou "Ative GPS"
  → Não permitir foto se GPS não disponível

Server-side (Segurança - INCONTORNÁVEL):
  → Validar GPS coordinate vs trabalho esperado
  → Rejeitar se > 100m de distância configurada
  → Log de todas as submissões
```

**Considerações técnicas:**
- Funciona offline: salva GPS local, sincroniza depois
- Background location: permite tracking em segundo plano
- Energy efficient: batch updates a cada 5 min
- Fallback para GPS aproximado se fine não disponível

---

### 3. Câmera

**Propósito:** Capturar fotos de obras como evidências de progresso.

**Funcionalidades:**
- Câmera integrada no app (não sistema)
- Filtros básicos (brilho, contraste)
- Zoom (se hardware suporta)
- Flash (automático ou manual)
- Compressão automática

**Dados coletados:**
- Foto (formato JPEG, comprimida)
- Exif metadata (GPS anexado automaticamente)
- Timestamp
- Camera info (qual câmera foi usada)

**Retenção:** Conforme retenção de obra (24 meses típico)

**Permissões necessárias:**

| Sistema | Permissão | iOS | Android |
|---------|-----------|-----|---------|
| Câmera | Camera access | NSCameraUsageDescription | CAMERA |
| Imagem picker | Gallery access | NSPhotoLibraryUsageDescription | READ_EXTERNAL_STORAGE |

**Por que necessário:**
- **Evidência visual:** Progresso da obra
- **Georeferenciado:** GPS anexado automaticamente
- **Imutável:** Hash dos dados para auditoria
- **Compliance:** Requisito para financiamento

**Flow:**
```
User clicks "Tirar foto"
  ↓ (if first time)
  ↓ App requests camera permission
  ↓ User grants (or denies)
  ↓
If granted:
  → Abre câmera
  → Captura foto
  → Anexa GPS
  → Comprime
  → Salva localmente
  → Mostra preview
  → User pode confirmar ou retomar

If denied:
  → Mostra alert "Permissão necessária"
  → Botão "Settings" abre iOS/Android settings
```

---

### 4. Simulação de Crédito

**Propósito:** Calcular limites e parcelas de crédito disponível.

**Funcionalidades:**
- Slider: valor desejado (R$ 0 - R$ 100.000)
- Parcelas: 12, 24, 36 meses
- Taxa: calculada automaticamente
- Juros totais: shown em time
- Calendário de pagamento: mostra cada parcela

**Dados utilizados (local):**
- CPF (already in app from KYC)
- Score de crédito (simulado ou via API externa)
- Histórico de aprovações (local)
- Localização (para taxas regionais)

**Sem permissões especiais necessárias**

**Cálculo (exemplo):**
```
Valor solicitado: R$ 50.000
Prazo: 24 meses
Taxa base: 3.5% a.m. (simulado)
Taxa regional: +0.5% (São Paulo)
Taxa risco: -0.2% (ótimo score)
Taxa final: 3.8% a.m.

Cálculo:
  Juros totais = 50.000 * (1 + 0.038)^24 - 50.000
               = 50.000 * 2.52 - 50.000
               = R$ 76.000 (juros)
  
  Parcela = (50.000 + 76.000) / 24
          = R$ 5.250/mês
```

**Segurança:**
- Cálculo local (não envia dados sensíveis)
- Nenhuma permissão solicitada
- Apenas informativo (sem compromisso)

---

### 5. Push Notifications

**Propósito:** Notificar usuário sobre aprovações, liberações e alertas.

**Casos de uso:**
```
Aprovação KYC:
  → "Parabéns! Seu KYC foi aprovado. Limite: R$ 50.000"
  
Liberação de parcela:
  → "Sua parcela #5 foi liberada. Confira no app."
  
Vencimento próximo:
  → "Parcela vence em 7 dias. Valor: R$ 5.250"
  
Atualização de status de obra:
  → "Obra 'Prédio Principal' atualizada. 12 novas fotos."
```

**Permissões necessárias:**

| Sistema | Permissão | Tipo |
|---------|-----------|------|
| iOS | Push Notification | APNS (Apple Push Notification service) |
| Android | Push Notification | FCM (Firebase Cloud Messaging) |

**Configuração:**

**iOS (APNS):**
```
1. Apple Developer Account → App ID → Capabilities
   → Enable "Push Notifications"
   
2. Create APNS certificate (prod + dev)
   
3. Download .p8 key (or .pem cert)
   
4. Configure in backend:
   - Upload APNS cert
   - Add Key ID + Team ID
   
5. Backend sends push via:
   - APNs API (native)
   - Firebase Cloud Messaging (recomendado)
```

**Android (FCM):**
```
1. Firebase Console → imbobi project
   
2. Cloud Messaging → Server API key
   
3. Download google-services.json
   
4. Add to apps/mobile/google-services.json
   
5. Backend sends push via:
   - Firebase REST API
   - Firebase Admin SDK
```

**Flow (frontend):**
```
App launches
  ↓
Solicita permissão:
  "Allow imbobi to send notifications?"
  
User grants
  ↓
App gera device token (automático)
  ↓
Envia token para backend:
  POST /users/me/notification-tokens
  { "token": "...", "platform": "ios|android" }
  
Backend stores token
  
Quando houver notificação:
  Backend → APNs/FCM → Device → App
```

**Tratamento:**
```
Foreground: 
  → Badge numero incrementa
  → Banner mostra
  → Usuário pode clicar → navega para tela relevante
  
Background:
  → Vibra ou som (conforme settings)
  → Badge incrementa
  → Usuário vê notification center
```

---

## Permissions Summary

### iOS (app.config.ts — infoPlist)

```typescript
infoPlist: {
  // 🔵 LOCALIZAÇÃO
  NSLocationWhenInUseUsageDescription:
    "O imbobi precisa da sua localização para validar que você 
    está na obra antes de enviar a foto.",
  
  NSLocationAlwaysAndWhenInUseUsageDescription:
    "O imbobi precisa da sua localização para validar o 
    registro de obra.",
  
  // 📸 CÂMERA & GALERIA
  NSCameraUsageDescription:
    "O imbobi precisa da câmera para registrar o progresso 
    da sua obra.",
  
  NSPhotoLibraryUsageDescription:
    "O imbobi precisa acessar suas fotos para enviar evidências 
    da obra.",
  
  // 🔐 BACKGROUND LOCATION (apps/mobile/Podfile)
  NSLocationAlwaysUsageDescription:
    "O imbobi precisa de acesso à localização em background 
    para validar sua presença.",
}
```

**Justificativa detalhada para App Store reviewers:**

```
LOCATION PERMISSIONS:
  Necessário para validar que o usuário está fisicamente 
  no local da obra antes de aceitar evidências fotográficas. 
  Isso é requisito central da aplicação de gerenciamento 
  de obras com crédito associado.
  
  - When In Use: Foto é tirada
  - Always And When In Use: Background tracking para auditoria
  - Always (Background): Validação contínua de presença

CAMERA:
  Captura de fotos georeferenciadas para evidência de 
  progresso. Sem a câmera, o app não consegue cumprir 
  sua função principal.

PHOTO LIBRARY:
  Alternativa à câmera. Permite usuário enviar fotos 
  já existentes (galeria) como evidência.
```

### Android (app.config.ts — permissions)

```typescript
permissions: [
  // 🔵 LOCALIZAÇÃO
  "android.permission.ACCESS_FINE_LOCATION",    // GPS preciso (~5m)
  "android.permission.ACCESS_COARSE_LOCATION",  // GPS aproximado (fallback)
  
  // 📸 CÂMERA & GALERIA
  "android.permission.CAMERA",                  // Câmera
  "android.permission.READ_EXTERNAL_STORAGE",   // Galeria (read)
  "android.permission.WRITE_EXTERNAL_STORAGE",  // Cache (write)
  
  // 🌐 CONECTIVIDADE
  "android.permission.INTERNET",                // HTTP/HTTPS
  "android.permission.ACCESS_NETWORK_STATE",    // Check connectivity
],

usesPermission: [
  {
    name: "android.permission.ACCESS_FINE_LOCATION",
    maxSdkVersion: 32,  // API 32 (Android 12) e abaixo
  },
]
```

**Justificativa para Google Play reviewers:**

```
LOCATION (ACCESS_FINE_LOCATION):
  Essencial. Validar localização do usuário em tempo real.
  Sem isso, não é possível garantir autenticidade da evidência.
  
CAMERA:
  Essencial. Captura de fotos da obra.
  
READ_EXTERNAL_STORAGE:
  Necessário. Acesso a galeria para importar fotos existentes.
  
WRITE_EXTERNAL_STORAGE:
  Necessário. Cache local de imagens antes de upload.
  
INTERNET:
  Essencial. API calls, notificações push.
  
ACCESS_NETWORK_STATE:
  Necessário. Detectar offline mode, sincronização inteligente.
```

---

## Runtime Permissions (User Control)

**Ambas plataformas (iOS 14+ / Android 6+):**

Permissões são solicitadas no momento de uso (não na instalação).

### iOS Flow

```
User tira foto
  ↓
if (! hasPermission('camera')) {
  → iOS mostra dialog:
    "imbobi gostaria de acessar sua câmera"
    [Não permitir]  [OK]
}
  ↓
if (user clicks OK)
  → Permissão concedida permanentemente
  → Próximas vezes, sem dialog
  
if (user clicks Não permitir)
  → Alert: "Permissão necessária"
  → Botão: "Abrir Settings"
  → Leva a Settings → Privacy → Camera
```

### Android Flow

```
User tira foto
  ↓
if (! hasPermission('camera')) {
  → Android mostra dialog:
    "imbobi precisa acessar a câmera"
    [Negar]  [Permitir]
}
  ↓
if (user clicks Permitir)
  → Permissão concedida
  
if (user clicks Negar)
  → Alert customizado: "Câmera necessária para fotos"
  → Botão "Abrir Settings"
  → Leva a Settings → Apps → imbobi → Permissions
```

---

## Permissions Revocation

**O que acontece se usuário nega depois?**

```
Scenario 1: User denies camera
  → Botão "Tirar foto" fica disabled
  → Tooltip: "Ative permissão de câmera em Settings"
  → User pode re-conceder em Settings
  
Scenario 2: User revokes location
  → Validação GPS fica red "❌ Localização desativada"
  → GPS validation falha no backend
  → User pode re-ativar em Settings → Location
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                    IMBOBI APP                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  LOGIN [CPF Input]                              │
│    ↓                                             │
│  KYC [Selfie + Document]  ──→ CAMERA [📸]      │
│    ↓                          GALLERY [🖼️]      │
│  VALIDATION (Backend)                           │
│    ↓                                             │
│  HOME [Dashboard]                               │
│    ├─ New Work Entry                            │
│    │   ↓                                         │
│    ├─ Capture Photo ──→ CAMERA [📸]             │
│    │   ↓                 + GPS [🔵]              │
│    ├─ Attach GPS ──→ LOCATION [GPS, Compass]   │
│    │   ↓                                         │
│    ├─ Upload Evidence                           │
│    │   ↓                                         │
│    ├─ Credit Simulation [Calculator - no perms] │
│    │   ↓                                         │
│    └─ Notifications ──→ APNs/FCM [🔔]           │
│                                                  │
└─────────────────────────────────────────────────┘
                      ↓
            ┌─────────────────────┐
            │   BACKEND (API)      │
            │  NestJS + Fastify    │
            │  PostgreSQL + PostGIS│
            └─────────────────────┘
                      ↓
       ┌────────────────┬────────────────┐
       │                │                │
    APNS (iOS)       FCM (Android)   Storage (S3)
```

---

## Compliance & Regulations

### LGPD (Lei Geral de Proteção de Dados)

**Aplicável ao Brasil:**

```
Coleta consentida:
  ✓ Usuário consente ao fazer login
  
Transparência:
  ✓ Privacy policy clara e acessível
  
Direito à deleção:
  ✓ User pode solicitar delete de dados
  ✓ Endpoint: DELETE /users/me
  
Direito à portabilidade:
  ✓ User pode exportar dados
  ✓ Endpoint: GET /users/me/export
```

### Financial Compliance

```
KYC Requirements (Lei Geral de Bancos):
  ✓ CPF validation
  ✓ Identity verification
  ✓ Document capture
  
AML (Anti-Money Laundering):
  ✓ Location validation
  ✓ Transaction limits
  ✓ Audit logs
  
Credit Offering:
  ✓ Transparent terms
  ✓ Clear interest rates
  ✓ Privacy policy
```

---

## Testing Checklist

### Before App Store Submission

- [ ] **Camera**
  - [ ] Selfie capture (KYC)
  - [ ] Document capture (KYC)
  - [ ] Work photo capture
  - [ ] Gallery import
  - [ ] Permissions request & handling

- [ ] **Location**
  - [ ] GPS enabled check
  - [ ] GPS validation in photo
  - [ ] Background location (iOS)
  - [ ] Location permission request
  - [ ] Offline GPS caching

- [ ] **Notifications**
  - [ ] Push notification reception
  - [ ] Notification click handling
  - [ ] Badge count
  - [ ] Custom notification payload

- [ ] **KYC Flow**
  - [ ] CPF validation (valid + invalid)
  - [ ] Selfie capture (success + failure)
  - [ ] Document capture (success + failure)
  - [ ] Biometric fallback (if enabled)

- [ ] **Credit Simulation**
  - [ ] Slider interaction
  - [ ] Installment calculation
  - [ ] Interest computation
  - [ ] Edge cases (R$ 0, max limit)

- [ ] **Permissions**
  - [ ] Request timing (not on launch)
  - [ ] User grant/deny handling
  - [ ] Settings navigation
  - [ ] Revocation handling

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **KYC** | Know Your Customer — Validação de identidade |
| **GPS** | Global Positioning System — Geolocalização |
| **APNS** | Apple Push Notification Service |
| **FCM** | Firebase Cloud Messaging |
| **LGPD** | Lei Geral de Proteção de Dados (Brasil) |
| **AML** | Anti-Money Laundering |
| **GeoRef** | Georreferenciado (com GPS anexado) |
| **Exif** | Metadata de foto (GPS, camera info, etc) |

---

**Última atualização:** 2026-05-28  
**Versão:** 1.0.0  
**Mantém por:** Desenvolvimento  
**Contato:** contato.vinicaetano93@gmail.com
