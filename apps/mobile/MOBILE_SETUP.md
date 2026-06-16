# Imobi Mobile App - Setup & Development Guide

## Overview

The Imobi mobile app is built with **Expo 51** and **Expo Router** using React Native. It provides construction project management features for borrowers to track obra (construction) progress, submit evidence of work completion, and manage credit financing.

## Architecture

### Screen Structure
```
├── (auth)              # Authentication flow (stack-based)
│   ├── login          # Email/password login
│   └── cadastro       # User registration
└── (tabs)             # Main app (tab-based)
    ├── obras          # Works/projects list and details
    │   └── [id]       # Dynamic obra detail screen
    │       ├── index  # Obra details with stages
    │       └── registrar # Evidence submission form
    ├── credito        # Credit simulator
    └── perfil         # User profile & logout
```

### Key Technologies
- **Expo 51** - React Native development platform
- **Expo Router** - File-based routing (similar to Next.js)
- **React Hook Form** - Form state management
- **Zod** - Schema validation (shared with web & API)
- **Zustand** - Global state management (setup ready)
- **Expo Secure Store** - Secure JWT token storage
- **Expo Location** - GPS validation for work sites
- **Expo Camera** - Photo capture for evidence
- **React Native Maps** - Map display for work locations

## Core Features Implemented

### 1. Authentication Flow
- **Login Screen** (`app/(auth)/login.tsx`)
  - Email/password validation via Zod schema
  - JWT token storage in Secure Store
  - Error handling with user feedback
  
- **Registration Screen** (`app/(auth)/cadastro.tsx`)
  - Full user registration with validation
  - Name, Email, CPF, Phone, Password
  - Automatic login after successful registration

- **Auth State Management** (`app/_layout.tsx`)
  - Token persistence check on app startup
  - Automatic routing to login if not authenticated
  - Seamless navigation after auth changes

### 2. Obras (Works) Management
- **Works List** (`app/(tabs)/obras/index.tsx`)
  - Displays all construction projects
  - Shows progress percentage per obra
  - Pull-to-refresh capability
  - Status badges (Planning, In Progress, Paused, Complete)
  - Card-based UI with shadows
  
- **Works Detail** (`app/(tabs)/obras/[id]/index.tsx`)
  - Full obra information display
  - Address and geolocation data
  - Credit information (approved, released, available)
  - Progress bar with percentage
  - List of stages (etapas) with status
  - Evidence submission buttons for active stages
  - Currency formatting (BRL)

### 3. Evidence Submission
- **Registration Screen** (`app/(tabs)/obras/[id]/registrar.tsx`)
  - GPS-based location validation
  - Real-time geofencing (must be within obra radius)
  - Camera integration for photo capture
  - Photo upload to backend with form data
  - Status indicators (checking, inside/outside radius)
  - Accuracy display (GPS precision in meters)

### 4. Additional Features
- **Credit Simulator** (`app/(tabs)/credito/index.tsx`)
  - Interactive sliders for loan amount & term
  - Real-time calculation of monthly payments
  - Total interest and CET display
  
- **User Profile** (`app/(tabs)/perfil/index.tsx`)
  - Display user information
  - Personal data (CPF, phone formatted)
  - KYC verification status
  - Secure logout with token revocation

## API Integration

### API Client Configuration
Location: `packages/core/src/services/api-client.ts`

**Behavior:**
- Automatically reads `EXPO_PUBLIC_API_URL` environment variable
- Falls back to `http://localhost:4000` for development
- Handles JWT token injection in Authorization header
- Provides error handling with status codes and messages

### Available Endpoints
```typescript
// Auth
POST   /auth/login              // Login with email/password
POST   /auth/registrar          // User registration
POST   /auth/renovar            // Refresh token
POST   /auth/logout             // Logout with refresh token

// Obras (Construction Projects)
GET    /api/v1/obras            // List all user works
GET    /api/v1/obras/:id        // Get specific obra details
GET    /api/v1/obras/:id/progresso // Get progress percentage

// Evidencias (Photo Evidence)
POST   /api/v1/evidencias       // Submit photo evidence (FormData)

// Crédito (Credit)
GET    /api/v1/credito/meus     // Get user credit products

// Score
GET    /api/v1/score            // Get user credit score

// User Profile
GET    /api/v1/usuarios/me      // Get current user profile

// Push Notifications
POST   /api/v1/push-notificacoes/registrar-token // Register FCM token
```

### Mobile API Helpers
Location: `apps/mobile/lib/api.ts`

Provides typed wrappers around the core `apiClient`:
- `obrasApi.listar()` - Fetch all works
- `obrasApi.buscar(obraId)` - Fetch obra details
- `creditoApi.meus()` - Fetch user credits
- `scoreApi.obter()` - Fetch credit score
- `pushApi.registrarToken(fcmToken)` - Register for notifications

## Environment Setup

### Development Environment

1. **Create `.env.local` file in `apps/mobile/`:**
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```

2. **Configure for local development:**
   ```
   EXPO_PUBLIC_API_URL=http://localhost:4000
   EAS_PROJECT_ID=your_eas_project_id
   ```

3. **For staging/production:**
   - Update `EXPO_PUBLIC_API_URL` to your deployment URL
   - Ensure API server is accessible from mobile device
   - For local testing on device, use your machine's IP: `http://192.168.x.x:4000`

### Running the App

```bash
# Install dependencies
pnpm install

# Start development server
cd apps/mobile
pnpm start

# If Expo Go cannot reach the LAN server, use the tunnel URL
pnpm start:tunnel

# If Expo Go shows a stale bundle URL or cache error
pnpm start:clear

# Or run a native development build on a simulator/device
pnpm android
pnpm ios

# For production builds
pnpm build:preview
pnpm build:production
```

## Security Considerations

### JWT Token Storage
- Tokens stored securely using `expo-secure-store`
- Access token: Short-lived (15 minutes)
- Refresh token: Longer-lived (7 days) for offline access
- Never exposed in async storage or memory

### GPS Validation
- **Client-side**: Real-time validation before camera opens
- **Server-side**: PostGIS validation (authoritative)
- Server validation cannot be bypassed
- Accuracy metadata tracked for audit trail

### API Security
- HTTPS enforced in production
- CORS configured for domain whitelist
- Rate limiting on auth endpoints (10 req/min)
- Request throttling on expensive operations

## Common Issues & Solutions

### API Connection Issues
- Check `EXPO_PUBLIC_API_URL` is set correctly
- For local development, use machine IP instead of localhost
- Verify API server is running: `curl $EXPO_PUBLIC_API_URL/health`

### Expo Go "Could not connect to development server"
- From the monorepo root, run `pnpm mobile:start:tunnel`; from `apps/mobile`, run `pnpm start:tunnel`
- Keep the terminal running while Expo Go loads the app; a QR code from an old/stopped server will keep failing
- If the phone and computer are on the same Wi-Fi, `pnpm start:lan` is faster than the tunnel
- If the error URL contains a different Expo package version than `apps/mobile/package.json`, stop Metro, delete `node_modules`, run `pnpm install --frozen-lockfile`, then restart with `pnpm start:clear`
- If you are using a current Expo Go app that no longer supports this project's SDK, install a compatible Expo Go version or use a development build from `pnpm ios`/`pnpm android`

### GPS Issues
- Request fine location permissions on Android
- Check device has GPS enabled
- Poor signal may increase accuracy uncertainty

### Token Expiration
- Refresh token automatically handled by logout flow
- For persistent session, implement token refresh interceptor
- Tokens cleared on logout for security

## Navigation Structure

### Route Hierarchy
```
RootLayout (Auth check)
├── /auth/login
├── /auth/cadastro
└── /(tabs)
    ├── /obras
    │   └── /obras/[id]
    │       ├── / (detail view)
    │       └── /registrar (evidence form)
    ├── /credito
    └── /perfil
```

## State Management

### Current Implementation
- **Authentication**: `useRouter()` + `SecureStore` + Root layout
- **Works**: Local state in components
- **Forms**: React Hook Form for validation

### Future Enhancement
- Zustand store setup ready in dependencies
- Consider global state for:
  - User profile caching
  - Works list pagination
  - Evidence upload queue

## Testing Checklist

- [ ] Login/logout flow works
- [ ] Works list loads and displays
- [ ] Obra details show correct information
- [ ] GPS validation prevents photo outside radius
- [ ] Photo upload succeeds within radius
- [ ] Credit simulator calculations correct
- [ ] Profile displays correct user data
- [ ] Tokens persist across app restart
- [ ] Network errors handled gracefully

## Next Steps for MVP Completion

### Mobile Parity with Web
- [x] Authentication (login, registration)
- [x] Works list display
- [x] Works detail view
- [x] Evidence submission form
- [x] GPS validation
- [x] Credit simulator
- [x] User profile
- [ ] Push notifications (Firebase setup needed)
- [ ] KYC verification flow (if required for MVP)
- [ ] Works map view (optional but useful)

### Production Readiness
- [ ] App icons and splash screens
- [ ] Error tracking (Sentry)
- [ ] Analytics (Segment/Mixpanel)
- [ ] Offline support (persist works list)
- [ ] Background sync for evidence uploads
- [ ] App store deployment configuration

## Contact & Support

For issues or questions:
- Check API documentation
- Review CLAUDE.md project guide
- Check backend error logs
- Verify environment variables are loaded
