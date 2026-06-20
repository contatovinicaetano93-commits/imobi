# Plano de Trabalho Paralelo — Claude + Cursor

> Criado em: 2026-06-20
> Objetivo: Dividir trabalho entre Claude (backend/API) e Cursor (frontend/mobile) para acelerar o lançamento

---

## Divisão de responsabilidades

| Agente | Domínio |
|--------|---------|
| **Claude** | Backend, API, arquitetura, banco de dados, infraestrutura, workers, segurança |
| **Cursor** | Frontend web (Next.js), mobile (Expo), UI/UX, componentes, telas |

---

## 🤖 CLAUDE — Backend, API, Infraestrutura

### Fase 1 — Bloqueios críticos
- [ ] Remover `marketplace.module.ts` (módulo vazio importado no AppModule)
- [ ] Finalizar consent tracking em `usuarios.service.ts:288` (obrigatório LGPD)
- [ ] Criar `email.worker.ts` no BullMQ — mover envio de email para fila
- [ ] Adicionar retry automático + alerta Slack nos workers
- [ ] Validar fluxo E2E: cadastro → obra → evidência → aprovação → liberação

### Fase 2 — Estabilidade
- [ ] Integrar Sentry no backend
- [ ] Adicionar rota `/admin/queues` com BullMQ Board
- [ ] Auditar variáveis de ambiente de produção
- [ ] Rodar load test contra staging
- [ ] Validar todas as migrations em banco limpo

### Fase 3 — Deploy produção
- [ ] Configurar `NODE_ENV=production` no Render
- [ ] Rodar migration no banco de produção
- [ ] Criar seed do primeiro usuário ADMIN
- [ ] Configurar CORS_ORIGIN com domínio real
- [ ] Monitoramento de uptime na rota `/api/v1/health`

---

## 🖥️ CURSOR — Frontend Web (Next.js 14) + Mobile (Expo 51)

### Contexto técnico
- **Stack web:** Next.js 14 App Router, Tailwind CSS, TypeScript strict, React Hook Form + Zod, Recharts, Leaflet
- **Stack mobile:** Expo 51, Expo Router, React Native, Zustand, Expo Camera, Expo Location
- **API base:** `https://imobi-api-efgg.onrender.com/api/v1`
- **Auth:** JWT via cookie `access_token` (httpOnly)
- **Middleware de rotas:** `apps/web/middleware.ts`

---

### FASE 1 — Páginas incompletas (alta prioridade)

**1. Relatórios Dashboard**
- Arquivo: `apps/web/app/(dashboard)/dashboard/relatorios/page.tsx`
- Status atual: scaffolding vazio
- O que fazer: cards com volume de crédito liberado por mês, obras por status, KYC pendentes, taxa de aprovação
- Usar `recharts` (já instalado) para gráficos de linha e barra
- Endpoints: `GET /api/v1/admin/metricas` e `GET /api/v1/admin/overview`
- Roles que acessam: GESTOR e ADMIN

**2. Preferências de Notificação**
- Criar: `apps/web/app/(dashboard)/dashboard/notificacoes/preferencias/page.tsx`
- Toggles para: email, push, in-app — por tipo de evento
- Endpoint: `PATCH /api/v1/usuarios/me/preferencias`
- Adicionar link na página de notificações existente

**3. Edição de Perfil**
- Arquivo: `apps/web/app/(dashboard)/dashboard/perfil/page.tsx`
- Status atual: read-only
- Adicionar formulário para editar nome e telefone
- Endpoint: `PATCH /api/v1/usuarios/me` com `UpdateUsuarioSchema`

---

### FASE 2 — UX crítica para lançamento

**4. Loading States globais**
- Criar: `apps/web/app/(dashboard)/_components/PageSkeleton.tsx`
- Aplicar em: obras, credito, kyc, notificacoes, score, gestor/etapas, gestor/kyc

**5. Empty States**
- Sem obras → CTA "Criar obra"
- Sem notificações → ícone + mensagem
- Sem leads → CTA para pipeline
- Padrão: ícone + texto + botão primário

**6. Toast/Feedback de ações**
- Instalar `sonner` ou `react-hot-toast`
- Usar em: aprovação de etapa, upload de evidência, solicitação de crédito
- Remover `alert()` / `confirm()` nativos do browser

**7. Responsividade mobile-web**
- Auditar layouts em < 768px
- Focar: tabelas de etapas (→ cards), formulário de obra, painel admin

---

### FASE 3 — Mobile (Expo 51)

**8. Sentry no Mobile**
- Instalar `@sentry/react-native`
- Inicializar em `apps/mobile/app/_layout.tsx`
- Wrapping `Sentry.wrap` no componente raiz

**9. Edição de Perfil Mobile**
- Arquivo: `apps/mobile/app/(tabs)/perfil/index.tsx`
- Adicionar modal/tela para editar nome e telefone
- Endpoint: `PATCH /api/v1/usuarios/me`

**10. Push Notifications Mobile**
- Pedir permissão no primeiro login
- Registrar token FCM via `POST /api/v1/push/registrar`
- Handler para notificações em foreground/background
- Usar `expo-notifications` (já na stack)

**11. Modo Offline básico**
- Cachear lista de obras localmente
- Banner "Sem conexão — dados podem estar desatualizados"
- Rotas `/obras` e `/obras/[id]` funcionam em leitura com cache

**12. Biometria no Login**
- Após primeiro login, oferecer Face ID / Digital
- Salvar token no `expo-secure-store`
- Usar `expo-local-authentication`

---

### FASE 4 — Polish pré-lançamento

**13. App Store / Play Store**
- Revisar `apps/mobile/app.json`: nome, ícone, splash, bundle ID
- Ícone: 1024x1024px PNG sem transparência
- Submeter TestFlight antes da App Store

**14. SEO e Meta tags (Web)**
- `metadata` export nas páginas públicas (`/`, `/simulador`, `/termos`, `/privacy-policy`)
- Open Graph para compartilhamento
- `robots.txt` bloqueando `/dashboard/*`

**15. Acessibilidade**
- `aria-label` em todos os botões de ícone
- Contraste WCAG AA nos textos
- Focus visible em todos os elementos interativos

---

### Arquivos de referência importantes

```
apps/web/
├── middleware.ts              # Auth + RBAC (não mexer na lógica)
├── next.config.js             # CSP headers, domínios S3
├── lib/
│   ├── api.ts                 # Funções de fetch com auth
│   ├── role-permissions.ts    # ROLE_HOME, normalizeRole
│   └── decode-jwt-payload.ts  # Decoder JWT Edge-compatible
└── app/(dashboard)/
    ├── _components/           # Componentes compartilhados
    └── dashboard/             # Páginas por role

apps/mobile/
├── app/
│   ├── _layout.tsx            # Root layout, auth check
│   ├── (auth)/                # Login e cadastro
│   └── (tabs)/                # Rotas protegidas
└── components/                # Componentes RN

packages/
├── schemas/src/               # Zod schemas — FONTE DE VERDADE
└── core/src/
    ├── utils/credito.ts       # Cálculo Price amortization
    ├── utils/haversine.ts     # Distância GPS
    └── services/api-client.ts # Axios com JWT
```

### Regras que NÃO podem ser quebradas
1. **Nunca commitar `.env`** — use `.env.example`
2. **GPS tem 2 camadas:** client (UX) + servidor PostGIS (incontornável)
3. **Liberação de parcela é sempre async** via BullMQ — nunca síncrono
4. **Zod schemas** são a fonte de verdade — não duplicar validação
5. **Roles:** ADMIN > GESTOR > ENGENHEIRO/GESTOR_OBRA > COMERCIAL/PARCEIRO > TOMADOR/CONSTRUTOR

---

## Prioridade de início

**Claude começa por:** Remover marketplace module + email worker (Fase 1)

**Cursor começa por:** Relatórios Dashboard (Fase 1, item 1) — primeira coisa que o GESTOR vê ao logar
