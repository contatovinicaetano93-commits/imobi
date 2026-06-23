# Integration Guide

## Overview

This guide explains how to integrate each portal (Manager Dashboard, Constructor Portal, Engineer Portal, and Funds Dashboard) with the backend API.

## Portal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Applications                      │
├─────────────────────────────────────────────────────────────┤
│  Manager Dashboard | Constructor Portal | Engineer Portal   │
│  Funds Dashboard   | Mobile App (Expo)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
            ┌────────▼──────────┐
            │   API Client      │
            │  (Next.js/Expo)   │
            └────────┬──────────┘
                     │
            ┌────────▼──────────┐
            │   NestJS API      │
            │  (FastifyAdapter) │
            └────────┬──────────┘
                     │
            ┌────────▼──────────┐
            │   PostgreSQL +    │
            │   PostGIS / Redis │
            └───────────────────┘
```

---

## Environment Variables Setup

### API Service (`services/api/.env`)

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Database (PostgreSQL + PostGIS)
DATABASE_URL=postgresql://imbobi:senha@localhost:5432/imbobi_dev

# Redis (BullMQ for async queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication
JWT_SECRET=sua_chave_secreta_com_minimo_64_caracteres_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (Evidence storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=seu_access_key_id
AWS_SECRET_ACCESS_KEY=seu_secret_access_key
S3_BUCKET=imbobi-evidencias

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=seu_sendgrid_api_key
SMTP_FROM=noreply@imbobi.com
APP_URL=http://localhost:3000

# External Integrations
UNICO_API_KEY=seu_unico_api_key
SERPRO_TOKEN=seu_serpro_token

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=seu_firebase_project_id
FIREBASE_PRIVATE_KEY=sua_firebase_private_key
FIREBASE_CLIENT_EMAIL=seu_firebase_email
```

### Web Application (`apps/web/.env.local`)

```env
# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# For production:
# NEXT_PUBLIC_API_URL=https://api.imbobi.com
```

### Mobile Application (`apps/mobile/.env`)

```env
# Expo Configuration
EXPO_PUBLIC_API_URL=http://localhost:4000
EAS_PROJECT_ID=seu_eas_project_id

# For production:
# EXPO_PUBLIC_API_URL=https://api.imbobi.com
```

---

## Manager Dashboard Integration

### Purpose
Approve/reject etapas (stages) and KYC documents from contractors and engineers.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/manager/dashboard` | GET | Get dashboard statistics |
| `/manager/etapas-pendentes` | GET | List pending stages for approval |
| `/manager/kyc-pendentes` | GET | List pending KYC documents |
| `/manager/etapas/{id}` | GET | Get stage details with evidence |
| `/manager/kyc/{id}` | GET | Get KYC document details |
| `/manager/etapas/{id}/aprovar` | PATCH | Approve a stage |
| `/manager/etapas/{id}/rejeitar` | PATCH | Reject a stage |
| `/manager/kyc/{id}/aprovar` | PATCH | Approve KYC document |
| `/manager/kyc/{id}/rejeitar` | PATCH | Reject KYC document |

### Implementation Steps

1. **Authentication**
   ```typescript
   // app/web/middleware.ts
   import { jwtVerify } from 'jose';
   
   export async function middleware(request: NextRequest) {
     const token = request.cookies.get('access_token')?.value;
     
     if (!token && request.nextUrl.pathname.startsWith('/dashboard/gestor')) {
       return NextResponse.redirect(new URL('/login', request.url));
     }
   }
   ```

2. **API Client Setup**
   ```typescript
   // lib/api.ts - Already configured
   export const managerApi = {
     dashboard: () => apiFetch<ManagerStats>("/manager/dashboard"),
     listarEtapasPendentes: (limit?: number, offset?: number) => ...,
     aprovarEtapa: (id: string, observacao?: string) => ...,
     rejeitarEtapa: (id: string, motivo: string) => ...,
   };
   ```

3. **Page Implementation**
   ```typescript
   // app/(dashboard)/dashboard/gestor/page.tsx
   export default async function ManagerDashboard() {
     const stats = await managerApi.dashboard();
     const etapas = await managerApi.listarEtapasPendentes(20, 0);
     
     return (
       <div>
         <DashboardStats stats={stats} />
         <EtapasTable data={etapas} />
       </div>
     );
   }
   ```

4. **Error Handling**
   ```typescript
   try {
     await managerApi.aprovarEtapa(id, observacao);
     // Refresh data
     router.refresh();
   } catch (error) {
     if (error instanceof ApiError) {
       if (error.status === 401) {
         // Redirect to login
       } else if (error.status === 403) {
         // Show permission denied
       }
     }
   }
   ```

### State Management Pattern

```typescript
const [pending, setPending] = useState<EtapaPendente[]>([]);
const [isLoading, setIsLoading] = useState(false);

const fetchPending = async () => {
  setIsLoading(true);
  try {
    const result = await managerApi.listarEtapasPendentes(20, 0);
    setPending(result.etapas);
  } catch (error) {
    console.error('Failed to load pending etapas', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchPending();
}, []);
```

---

## Constructor Portal Integration

### Purpose
Create works, submit stages with evidence photos, request and manage credit lines.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/obras` | POST | Create new work |
| `/obras` | GET | List my works |
| `/obras/{id}` | GET | Get work details |
| `/etapas/obra/{obraId}` | GET | List work stages |
| `/evidencias` | POST | Upload stage evidence |
| `/evidencias/etapa/{etapaId}` | GET | List stage evidence |
| `/credito/simular` | POST | Simulate credit |
| `/credito/solicitar` | POST | Request credit |
| `/credito/meus` | GET | Get my credits |
| `/kyc/upload` | POST | Upload KYC document |
| `/kyc/status` | GET | Get KYC status |

### Implementation Steps

1. **Work Creation Flow**
   ```typescript
   async function criarObra(data: CriarObraInput) {
     try {
       const obra = await obrasApi.criar(data);
       // Initialize with default stages
       // Redirect to work details
       router.push(`/obras/${obra.id}`);
     } catch (error) {
       // Handle validation errors
     }
   }
   ```

2. **Geolocation Validation** (Client + Server)
   ```typescript
   // Client-side validation
   const validateGeolocation = (lat: number, lng: number, obra: ObraResumo) => {
     const distance = calculateDistance(
       { lat, lng },
       { lat: obra.geoLatitude, lng: obra.geoLongitude }
     );
     
     return distance <= obra.raioValidacaoMetros;
   };
   
   // Server validation happens in evidencias.service.ts
   // PostGIS validates: ST_Distance_Sphere(point, obra.geo) <= raio
   ```

3. **Evidence Upload**
   ```typescript
   async function uploadEvidencia(file: File, etapaId: string) {
     // Get current location
     const position = await getCurrentPosition();
     
     // Upload to S3
     const url = await uploadToS3(file);
     
     // Register with API
     const evidencia = await evidenciasApi.upload({
       etapaId,
       fotoUrl: url,
       latCaptura: position.coords.latitude,
       lngCaptura: position.coords.longitude,
       accuracyMetros: position.coords.accuracy
     });
     
     return evidencia;
   }
   ```

4. **Credit Simulation & Request**
   ```typescript
   // Simulation (no auth required)
   const simulacao = await creditoApi.simular({
     valorSolicitado: 500000,
     prazoMeses: 24,
     tipoObra: 'residencial'
   });
   
   // Request (authenticated)
   const credito = await creditoApi.solicitar({
     valorSolicitado: 500000,
     prazoMeses: 24,
     obraId: obra.id,
     tipoObra: 'residencial'
   });
   ```

---

## Engineer Portal Integration

### Purpose
Visit works, submit stage evidence, manage geolocation-based visit queue.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/obras` | GET | List available works |
| `/obras/{id}` | GET | Get work details |
| `/etapas/obra/{obraId}` | GET | List work stages |
| `/evidencias` | POST | Upload evidence photo |
| `/evidencias/etapa/{etapaId}` | GET | View stage evidence |
| `/score/atual` | GET | Get credit score |
| `/usuarios/meu-perfil` | GET | Get profile |

### Implementation Steps

1. **Works Queue by Location**
   ```typescript
   // Fetch nearby works based on current location
   async function getNearbyWorks(lat: number, lng: number, radiusKm: number) {
     const works = await obrasApi.listar();
     
     const nearby = works.filter(obra => {
       const distance = calculateDistance(
         { lat, lng },
         { lat: obra.geoLatitude, lng: obra.geoLongitude }
       );
       return distance <= radiusKm;
     });
     
     // Sort by distance
     return nearby.sort((a, b) => {
       const distA = calculateDistance(
         { lat, lng },
         { lat: a.geoLatitude, lng: a.geoLongitude }
       );
       const distB = calculateDistance(
         { lat, lng },
         { lat: b.geoLatitude, lng: b.geoLongitude }
       );
       return distA - distB;
     });
   }
   ```

2. **Visit Tracking**
   ```typescript
   // Track engineer visits with timestamp
   const logVisit = async (obraId: string) => {
     const timestamp = new Date().toISOString();
     const position = await getCurrentPosition();
     
     // Store in local state/database
     // API will validate geofence on evidence upload
   };
   ```

3. **Evidence Capture Flow**
   ```typescript
   async function captureEvidence(etapaId: string) {
     // 1. Get current location with high accuracy
     const position = await getCurrentPosition({ 
       enableHighAccuracy: true, 
       maximumAge: 0 
     });
     
     // 2. Take photo
     const photo = await takePhoto();
     
     // 3. Validate geofence (client-side)
     const obra = await obrasApi.buscar(currentObraId);
     const isInGeofence = validateGeolocation(
       position.coords.latitude,
       position.coords.longitude,
       obra
     );
     
     if (!isInGeofence) {
       showError('Você está fora do geofence da obra');
       return;
     }
     
     // 4. Upload evidence
     await uploadEvidencia(photo, etapaId);
   }
   ```

---

## Funds Dashboard Integration

### Purpose
Aggregate fund data, monitor portfolio, generate reports, analyze defaults.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/manager/dashboard` | GET | Get aggregate statistics |
| `/credito/meus` | GET | Get portfolio credits |
| `/obras` | GET | Get works list |
| `/score/atual` | GET | Get credit score data |

### Implementation Steps

1. **Data Aggregation**
   ```typescript
   async function aggregateFundoData() {
     const [stats, credits, works] = await Promise.all([
       managerApi.dashboard(),
       creditoApi.meus(),
       obrasApi.listar()
     ]);
     
     return {
       totalPortfolio: credits.reduce((sum, c) => sum + c.valorAprovado, 0),
       totalLiberado: credits.reduce((sum, c) => sum + c.valorLiberado, 0),
       creditosAtivos: stats.creditosAtivos,
       obrasAtivas: stats.obrasAtivas,
       inadimplencia: calculateInadimplencia(credits),
       distribuicao: calculateDistribution(works)
     };
   }
   ```

2. **Report Generation**
   ```typescript
   async function generateReport(format: 'pdf' | 'csv') {
     const data = await aggregateFundoData();
     
     if (format === 'pdf') {
       return generatePdfReport(data);
     } else {
       return generateCsvReport(data);
     }
   }
   ```

---

## Error Handling Patterns

### Global Error Handler

```typescript
// lib/api.ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: new Headers(init.headers),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

### Component Error Handling

```typescript
function EtapaCard({ etapa }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleApprove = async () => {
    setIsLoading(true);
    setError(undefined);
    
    try {
      await managerApi.aprovarEtapa(etapa.id);
      // Success feedback
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
          router.push('/login');
        } else if (error.status === 403) {
          setError('Você não tem permissão para aprovar etapas.');
        } else {
          setError(error.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && <ErrorAlert message={error} />}
      <button onClick={handleApprove} disabled={isLoading}>
        {isLoading ? 'Processando...' : 'Aprovar'}
      </button>
    </div>
  );
}
```

---

## Authentication Flow

### Login & Token Storage

```typescript
async function handleLogin(email: string, senha: string) {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
      credentials: 'include' // For cookies
    });

    const data = await response.json();
    
    // Store tokens
    // - accessToken: Short-lived (15m)
    // - refreshToken: Long-lived (7d) - stored in httpOnly cookie
    
    // Redirect based on user type
    if (data.usuario.tipo === 'gestor') {
      router.push('/dashboard/gestor');
    } else if (data.usuario.tipo === 'construtor') {
      router.push('/dashboard/construtor');
    }
  } catch (error) {
    console.error('Login failed', error);
  }
}
```

### Token Refresh

```typescript
// Middleware automatically refreshes before token expires
export async function middleware(request: NextRequest) {
  let token = request.cookies.get('access_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if token is expiring soon
  const decoded = jwtDecode(token);
  const now = Math.floor(Date.now() / 1000);
  const timeToExpire = (decoded.exp ?? 0) - now;

  if (timeToExpire < 60) { // Less than 1 minute
    const refreshToken = request.cookies.get('refresh_token')?.value;
    
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/renovar`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      const { accessToken } = await response.json();
      
      const newRequest = request.clone();
      newRequest.cookies.set('access_token', accessToken);
      return NextResponse.next(newRequest);
    } catch (error) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
```

---

## Real-time Updates (Optional)

### Webhook Notifications (Future)

```typescript
// Configure webhooks in API for events:
// - etapa.aprovada
// - kyc.rejeitada
// - credito.liberado
// - evidencia.validada

const handleWebhook = (event: WebhookEvent) => {
  switch (event.type) {
    case 'etapa.aprovada':
      // Update UI or refetch data
      break;
    case 'credito.liberado':
      // Show notification
      break;
  }
};
```

### Polling Alternative

```typescript
const useAutoPoll = (fn: () => Promise<any>, interval: number) => {
  useEffect(() => {
    const intervalId = setInterval(fn, interval);
    return () => clearInterval(intervalId);
  }, [fn, interval]);
};

// Usage
useAutoPoll(
  () => managerApi.listarEtapasPendentes(),
  5000 // Poll every 5 seconds
);
```

---

## Data Validation

### Client-Side (Zod Schemas)

```typescript
// packages/schemas/index.ts
import { z } from 'zod';

export const CriarObraSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  endereco: z.string().min(5, 'Endereço inválido'),
  geoLatitude: z.number().min(-90).max(90),
  geoLongitude: z.number().min(-180).max(180),
  raioValidacaoMetros: z.number().min(10).max(500)
});

export type CriarObraInput = z.infer<typeof CriarObraSchema>;
```

### Server-Side (Automatic with ZodPipe)

```typescript
// services/api/src/common/pipes/zod.pipe.ts
@Controller('obras')
export class ObrasController {
  @Post()
  criar(
    @Body(new ZodPipe(CriarObraSchema)) body: unknown
  ) {
    // body is validated and type-safe
    return this.obras.criar(body as never);
  }
}
```

---

## Deployment Checklist

- [ ] Update `NEXT_PUBLIC_API_URL` to production API
- [ ] Set `NODE_ENV=production` in API service
- [ ] Configure `CORS_ORIGIN` with production domains
- [ ] Update database `DATABASE_URL` to production PostgreSQL
- [ ] Set strong `JWT_SECRET` (min 64 characters)
- [ ] Configure AWS S3 credentials and bucket
- [ ] Set up SMTP credentials for email
- [ ] Configure Firebase for push notifications
- [ ] Enable HTTPS on all endpoints
- [ ] Set up SSL certificates
- [ ] Configure monitoring and logging
- [ ] Set up automated backups for database
- [ ] Test all authentication flows
- [ ] Verify geolocation validation (PostGIS)
- [ ] Load test the API

---

## Troubleshooting

### API Connection Issues

```
ERROR: Cannot reach API at http://localhost:4000
```

**Solutions**:
1. Verify API is running: `pnpm dev`
2. Check `NEXT_PUBLIC_API_URL` is correct
3. Ensure CORS is configured: `CORS_ORIGIN=http://localhost:3000`
4. Check firewall/network policies

### Authentication Failures

```
ERROR: 401 Unauthorized
```

**Solutions**:
1. Token expired - call `/auth/renovar` with refresh token
2. Invalid token - clear cookies and login again
3. Missing header - ensure `Authorization: Bearer {token}` is sent

### Geofence Validation

```
ERROR: Evidência fora do geofence
```

**Solutions**:
1. Ensure GPS has high accuracy (enableHighAccuracy: true)
2. Check work's `raioValidacaoMetros` is reasonable
3. Verify PostGIS is installed and configured
4. Test with: `SELECT ST_Distance_Sphere(point1, point2)`

### Database Connection

```
ERROR: Connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:
1. Ensure PostgreSQL is running
2. Verify `DATABASE_URL` is correct
3. Check database exists: `psql -l`
4. Verify PostGIS extension: `psql -c "CREATE EXTENSION IF NOT EXISTS postgis"`
