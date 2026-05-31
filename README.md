# IMOBI — Estrutura Financeira para Construção Civil

**IMOBI** is a fintech platform that provides structured financing for construction projects in Brazil. The system enables builders to access credit with geovalidated step-by-step disbursement and investors to earn stable returns with multiple guarantee layers.

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20.0.0
- pnpm ≥ 9.0.0
- PostgreSQL (or SQLite for local development)

### Installation
```bash
git clone <repo-url>
cd imobi
pnpm install
```

### Development
```bash
# Start web app (http://localhost:3000) + API (http://localhost:4000)
pnpm dev

# Type checking across all packages
pnpm type-check

# Production build
pnpm build

# Database operations
pnpm db:migrate     # Run migrations
pnpm db:generate    # Regenerate Prisma client
pnpm db:studio      # Open Prisma Studio
```

### API Documentation
```bash
# View interactive API docs (Swagger/OpenAPI)
# Available at http://localhost:4000/api/v1/docs when running pnpm dev

# Endpoints:
# POST   /api/v1/auth/registrar          - User registration
# POST   /api/v1/auth/login              - User login
# POST   /api/v1/auth/renovar            - Refresh access token
# POST   /api/v1/auth/logout             - Revoke refresh token
# 
# GET    /api/v1/obras                   - List user's obras
# POST   /api/v1/obras                   - Create new obra
# GET    /api/v1/obras/:id               - Get obra details
# GET    /api/v1/obras/:id/progresso     - Get construction progress
#
# POST   /api/v1/simulador/calcular      - Calculate credit simulation
# POST   /api/v1/credito/solicitar       - Request credit
# GET    /api/v1/credito/meus            - List user's credits
# GET    /api/v1/credito/:id/extrato     - Credit statement
#
# POST   /api/v1/evidencias/upload       - Upload progress photo (GPS validated)
# GET    /api/v1/evidencias/etapa/:id    - List evidence for stage
#
# POST   /api/v1/kyc/upload              - Upload KYC document
# GET    /api/v1/kyc/status              - Check KYC status
#
# GET    /api/v1/manager/dashboard       - Manager statistics
# GET    /api/v1/manager/etapas-pendentes - Pending stage approvals
# POST   /api/v1/manager/etapas/batch-aprovar - Bulk approve stages (up to 100)
# POST   /api/v1/manager/kyc/batch-aprovar   - Bulk approve KYC (up to 100)
#
# GET    /health                         - Health check with infrastructure status
```

## 📁 Project Structure

```
imobi/
├── apps/
│   ├── web/          # Next.js 14 web application (App Router)
│   └── mobile/       # Expo 51 React Native mobile app
├── packages/
│   ├── core/         # Shared utilities, hooks, API client (zero deps)
│   ├── schemas/      # Zod validation schemas (single source of truth)
│   └── ui/           # Shared UI components (shadcn + RN)
├── services/
│   ├── api/          # NestJS 10 + Fastify backend API
│   └── workers/      # BullMQ async workers (credit liberation)
└── prisma/           # Database schema & migrations
```

## 🏗️ Architecture

### Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Web:** Next.js 14 with App Router & route groups
- **Mobile:** Expo 51 with Expo Router
- **Backend:** NestJS 10 with Fastify (not Express)
- **Database:** PostgreSQL + Prisma ORM + PostGIS
- **Cache/Queues:** Redis + BullMQ
- **Storage:** AWS S3 for construction photos
- **Error Tracking:** Sentry

### Key Features

#### 📊 Simulador (Credit Calculator)
- Real-time credit simulation based on project value, type, and timeline
- LTV calculation (70-85% depending on project phase)
- Automated interest rate calculation by project type
- Used to pre-screen borrowers before full KYC

#### 🏗️ Obra Management
- Create construction projects with GPS coordinates
- Track multiple credit phases (Terreno, Construção, Acabamento, Comprador)
- Milestone-based disbursement

#### 📸 Geovalidated Evidence
- Upload construction progress photos with GPS validation
- Two-layer validation: client-side UX + server-side PostGIS
- EXIF data extraction and accuracy checks
- Enable automatic stage approval based on visual evidence

#### 👤 KYC (Know Your Customer)
- 100% digital KYC process (no paperwork)
- Document upload and verification
- Approval in 48 hours

#### 🎯 Manager Dashboard
- Pending stage approvals with bulk actions
- KYC document review queue
- Priority filtering and date range filtering
- Audit logs for compliance

#### 💰 Credit Liberation
- Automatic partial disbursement on stage completion
- BullMQ async worker processes approvals
- 5-layer guarantee structure:
  1. Fiduciary lien on property
  2. Project receivables
  3. 10% reserve fund
  4. Credit insurance
  5. Rigorous due diligence

## 🎨 Landing Page Design

Modern pitch deck aesthetic with professional color scheme:
- **Primary Green (#30D158)** - CTAs and highlights
- **Secondary Blue (#0052CC)** - Gradients and secondary elements
- **Dark Slate Theme** - Modern, professional dark background

9 comprehensive sections:
1. Hero with stats and CTAs
2. 5-step credit journey
3. Why choose IMOBI (4 differentials)
4. Product offerings (4 product types)
5. How it works in practice (5 steps)
6. Key metrics display
7. Security & guarantee layers
8. Customer testimonials
9. FAQ with collapsible answers

## ✅ Current Status

### Build & Type Safety
- ✅ Production build passing (4 packages compiled, 35 pages generated)
- ✅ All packages pass TypeScript type checking
- ✅ Zero compilation errors
- ✅ No ESLint violations or console.log cleanup needed

### API Routes & Security
- ✅ `/api/v1` prefix correctly implemented
- ✅ All 15+ modules initializing without errors
- ✅ CORS configured with production validation
- ✅ JWT authentication with token refresh
- ✅ Rate limiting on all endpoints
- ✅ Role-based access control (RBAC)
- ✅ Admin dashboard protected by role check
- ✅ Input validation on all critical endpoints
- ✅ Environment validation at startup

### Web Application
- ✅ Landing page with pitch deck colors (green #30D158, blue #0052CC)
- ✅ Signup form with password validation (8+ chars, uppercase, number)
- ✅ Login form with session management
- ✅ Credit calculator (simulador) with rate limiting
- ✅ Manager dashboard with bulk filtering
- ✅ Engineer inspection tracking with GPS validation
- ✅ Admin statistics dashboard with access control
- ✅ KYC document management and workflow
- ✅ Obra creation and stage management

### Infrastructure & Database
- ✅ PostgreSQL + PostGIS for geolocation
- ✅ Prisma migrations with versioning (5 migrations)
- ✅ Redis for caching (5min default TTL)
- ✅ BullMQ async workers for credit liberation
- ✅ Sentry error tracking configured
- ✅ Firebase Cloud Messaging for push notifications
- ✅ AWS S3 for secure evidence storage
- ✅ Comprehensive database indexing
- ✅ Audit logging for etapas and KYC documents

## 🔧 Configuration

### Environment Variables (`.env`)

**Web App** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**API** (`services/api/.env`):
```env
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=4000
JWT_SECRET=your-secret-key
NODE_ENV=development
CORS_ORIGIN=localhost:3000
```

## 🧪 Testing

### Type Checking
```bash
pnpm type-check  # All packages
```

### Manual Testing Checklist
- [ ] Landing page loads with correct styling
- [ ] Signup form submits to `/api/v1/auth/registrar`
- [ ] Login form returns JWT tokens
- [ ] Simulador calculates correct LTV and rates
- [ ] Create obra with GPS coordinates
- [ ] Upload evidence photos with EXIF validation
- [ ] Manager dashboard loads pending items
- [ ] Approval workflow processes correctly
- [ ] Credit liberation triggers via BullMQ

## 📚 Documentation

### API Documentation
- **Interactive Swagger UI**: Available at `/api/v1/docs` (development mode only)
  - Comprehensive endpoint descriptions
  - Request/response schemas
  - Live API testing interface
  - Authentication support (Bearer token)

### Code Documentation
- `CLAUDE.md` - Project guidelines and standards
- `WORK_COMPLETED.md` - Latest session progress
- `SETUP.md` - Detailed setup instructions

## 🚢 Deployment

### Vercel (Next.js Web App)
1. Connect repository to Vercel
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy automatically on push to main

### Railway or AWS (NestJS API)
1. Deploy containerized API
2. Provision PostgreSQL + Redis
3. Set environment variables
4. Run database migrations

## 🔐 Security

- ✅ JWT tokens for authentication (15m access, 7d refresh)
- ✅ HttpOnly cookies for session storage
- ✅ CORS configured for trusted origins with production validation
- ✅ Environment variables for sensitive data (validated at startup)
- ✅ Sentry for error tracking and performance monitoring
- ✅ Rate limiting on all endpoints (auth, uploads, manager operations)
- ✅ Role-based access control (ADMIN, GESTOR_OBRA, TOMADOR, PARCEIRO)
- ✅ Server-side GPS validation with PostGIS
- ✅ S3 encryption for evidence storage (AES256)
- ✅ Input validation with Zod schemas
- ✅ Global exception filter for consistent error responses

## 🚀 Production Deployment Checklist

Before deploying to production, ensure:

- [ ] Database: PostgreSQL with PostGIS extension installed
- [ ] Redis: Standalone instance or managed service
- [ ] AWS S3: Bucket created with encryption enabled
- [ ] Firebase: Service account key generated
- [ ] Email Provider: SendGrid API key or SES configured
- [ ] Sentry: Project created and DSN obtained
- [ ] Vercel: Repository connected for automatic web deployment
- [ ] Environment Variables: All `.env.example` values configured
- [ ] Database Migrations: Run `pnpm db:migrate` on deployment
- [ ] SSL/HTTPS: Enabled on both web and API
- [ ] CORS_ORIGIN: Set to production domain
- [ ] JWT_SECRET: Generate strong 64+ character random key
- [ ] Monitoring: Set up Sentry alerts and dashboards
- [ ] Backups: Configure automated PostgreSQL backups
- [ ] Load Testing: Run performance tests with k6 (infrastructure included)

## 📞 Support

For questions or issues, refer to:
1. `CLAUDE.md` - Project rules and conventions
2. Individual package `README.md` files
3. `WORK_COMPLETED.md` - Detailed implementation notes
4. Commit messages for implementation details

## 📝 License

Proprietary - IMOBI

---

**Last Updated:** May 31, 2026  
**Branch:** `claude/gifted-hawking-ULZTB`
