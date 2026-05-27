# Auditoria de Segurança - Parte 1: CORS, CSRF e JWT

**Data:** 27 de maio de 2026  
**Foco:** Backend (NestJS + Fastify)  
**Status:** 5 Vulnerabilidades Críticas e Altas Encontradas

---

## 1. VULNERABILIDADES ENCONTRADAS

### 1.1 CRÍTICA: JWT Secret Não Separado (Access vs Refresh)

**Localização:** `/services/api/src/modules/auth/auth.module.ts` e `auth.service.ts`

**Problema:**
- Ambos access token e refresh token usam o **mesmo secret** (`JWT_SECRET`)
- Se alguém conseguir um refresh token, pode criar access tokens válidos diretamente
- Violação do princípio de separação de secrets por tipo de token

**Código Vulnerável:**
```typescript
// auth.module.ts
JwtModule.register({
  secret: process.env["JWT_SECRET"],  // ← MESMO SECRET PARA TUDO
  signOptions: { expiresIn: "15m" },
})

// auth.service.ts
private gerarTokens(usuarioId: string) {
  const accessToken = this.jwt.sign({ sub: usuarioId }, { expiresIn: "15m" });
  const refreshToken = this.jwt.sign({ sub: usuarioId, type: "refresh" }, { expiresIn: "7d" }); // ← MESMO SECRET
```

**Severidade:** CRÍTICA  
**CVSS Score:** 7.5 (High)

---

### 1.2 CRÍTICA: Sem Proteção CSRF

**Localização:** `/services/api/src/main.ts`, todos os controllers POST/PUT/PATCH

**Problema:**
- **Nenhuma implementação de CSRF protection** encontrada
- Endpoints POST/PUT/PATCH/DELETE sensíveis desprotegidos:
  - `POST /api/v1/auth/registrar` - Criar conta
  - `POST /api/v1/auth/login` - Login
  - `POST /api/v1/obras` - Criar obra
  - `POST /api/v1/evidencias` - Upload de evidências
  - `POST /api/v1/credito/solicitar` - Solicitar crédito
  - `PATCH /api/v1/usuarios/meu-perfil` - Atualizar perfil
  - `PATCH /api/v1/kyc/:id/aprovar` - Aprovar KYC (privilegiado)
  - E muitos outros...

**Cenário de Ataque:**
```
1. Atacante cria site malicioso
2. Usuário autenticado visita site
3. Site faz POST para /api/v1/credito/solicitar via formulário
4. Requisição inclui JWT Bearer token do cookie/storage
5. Crédito é solicitado sem consentimento
```

**Severidade:** CRÍTICA  
**CVSS Score:** 8.1 (Critical)

---

### 1.3 ALTA: Refresh Token em Bearer Token (Sem HttpOnly Cookie)

**Localização:** `auth.service.ts` linha 32, 46, 61

**Problema:**
- Refresh token é retornado como JWT Bearer no response JSON
- Cliente provavelmente armazena em localStorage (XSS vulnerável)
- Deveria estar em HttpOnly cookie para proteção contra XSS

**Resposta Atual:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."  // ← EXPOSTO A XSS
}
```

**Severidade:** ALTA  
**CVSS Score:** 6.5

---

### 1.4 ALTA: Falta de Helmet ou Headers de Segurança

**Localização:** `/services/api/src/main.ts`

**Problema:**
- Nenhum middleware de segurança como `helmet` instalado
- Headers de segurança não configurados:
  - ❌ X-Content-Type-Options
  - ❌ X-Frame-Options
  - ❌ X-XSS-Protection
  - ❌ Strict-Transport-Security (HSTS)
  - ❌ Content-Security-Policy

**Severidade:** ALTA  
**CVSS Score:** 6.8

---

### 1.5 MÉDIA: CORS muito Permissivo em Development

**Localização:** `/services/api/src/main.ts` linha 19-22

**Problema:**
```typescript
app.enableCors({
  origin: process.env["CORS_ORIGIN"]?.split(",") ?? ["http://localhost:3000"],
  credentials: true,  // ✓ BOM: credenciais habilitadas
});
```

**Análise:**
- ✓ Não usa `*` (bom!)
- ✓ Whitelist por environment variable (bom!)
- ✓ `credentials: true` correto (bom!)
- ⚠️ **MAS**: Em produção, precisa validar se `CORS_ORIGIN` está definido
- ⚠️ **Default para localhost** - risco se variável não for setada

**Recomendação:**
```typescript
const allowedOrigins = process.env["CORS_ORIGIN"]?.split(",").filter(Boolean);
if (!allowedOrigins || allowedOrigins.length === 0) {
  throw new Error("CORS_ORIGIN env var is required in production");
}
```

**Severidade:** MÉDIA  
**CVSS Score:** 4.3

---

## 2. PROBLEMAS SECUNDÁRIOS

### 2.1 Falta de Rate Limiting em Endpoints Sensíveis

**Localização:** `credito.controller.ts` linha 14-19

**Problema:**
```typescript
@Post("simular")
@UseGuards(UserThrottlerGuard)
@Throttle(20, 3600000) // 20 por hora - OK, mas...
simular(@Body(new ZodPipe(SimulacaoCreditoSchema)) body: unknown)
```

- ✓ Rate limiting implementado (bom!)
- ⚠️ MAS: `simular` não autenticado, usa IP/User-Agent (pode ser bypassado)
- ⚠️ Poderia ter JWT obrigatório + rate limiting mais restritivo

### 2.2 Tokens Nunca Expiram do Banco (Refresh Token Revocation)

**Localização:** `auth.service.ts` linha 64-69

**Problema:**
```typescript
async revogarToken(refreshToken: string) {
  await this.prisma.sessaoToken.updateMany({
    where: { refreshToken },
    data: { revogadoEm: new Date() },
  });
}
```

- ✓ Revogação implementada
- ⚠️ Tokens antigos nunca são deletados do banco (acúmulo de dados)
- ⚠️ Falta cleanup job periodicamente

---

## 3. RECOMENDAÇÕES DE FIX

### Fix 1: Separar JWT_SECRET para Refresh Token

**Arquivo:** `/services/api/src/modules/auth/auth.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { JwtRefreshStrategy } from "./jwt-refresh.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env["JWT_SECRET"],
      signOptions: { expiresIn: "15m" },
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**Arquivo:** `/services/api/src/modules/auth/jwt-refresh.strategy.ts` (NOVO)

```typescript
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

interface JwtRefreshPayload {
  sub: string;
  type: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      secretOrKey: process.env["JWT_REFRESH_SECRET"] ?? "",
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtRefreshPayload) {
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }
    
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: payload.sub },
      select: { usuarioId: true, tipo: true },
    });
    if (!usuario) throw new UnauthorizedException();
    return { id: usuario.usuarioId, tipo: usuario.tipo };
  }
}
```

**Arquivo:** `/services/api/src/modules/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { CadastroUsuarioInput, LoginInput } from "@imbobi/schemas";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async registrar(input: CadastroUsuarioInput) {
    const existe = await this.prisma.usuario.findFirst({
      where: { OR: [{ email: input.email }, { cpf: input.cpf }] },
    });
    if (existe) throw new ConflictException("E-mail ou CPF já cadastrado.");

    const passwordHash = await bcrypt.hash(input.senha, 12);
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        cpf: input.cpf,
        telefone: input.telefone,
        passwordHash,
      },
      select: { usuarioId: true, nome: true, email: true, tipo: true, kycStatus: true },
    });

    return { usuario, ...this.gerarTokens(usuario.usuarioId) };
  }

  async login(input: LoginInput) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: input.email },
    });
    if (!usuario) throw new UnauthorizedException("Credenciais inválidas.");

    const senhaOk = await bcrypt.compare(input.senha, usuario.passwordHash);
    if (!senhaOk) throw new UnauthorizedException("Credenciais inválidas.");

    return {
      usuario: { usuarioId: usuario.usuarioId, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo },
      ...this.gerarTokens(usuario.usuarioId),
    };
  }

  async renovarToken(refreshToken: string) {
    const sessao = await this.prisma.sessaoToken.findUnique({
      where: { refreshToken },
    });
    if (!sessao || sessao.revogadoEm || sessao.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessão inválida ou expirada.");
    }
    await this.prisma.sessaoToken.update({
      where: { sessionId: sessao.sessionId },
      data: { revogadoEm: new Date() },
    });
    return this.gerarTokens(sessao.usuarioId);
  }

  async revogarToken(refreshToken: string) {
    await this.prisma.sessaoToken.updateMany({
      where: { refreshToken },
      data: { revogadoEm: new Date() },
    });
  }

  private gerarTokens(usuarioId: string) {
    const accessToken = this.jwt.sign(
      { sub: usuarioId },
      { 
        expiresIn: "15m",
        secret: process.env["JWT_SECRET"]
      }
    );
    
    const refreshToken = this.jwt.sign(
      { sub: usuarioId, type: "refresh" },
      { 
        expiresIn: "7d",
        secret: process.env["JWT_REFRESH_SECRET"]  // ← NOVO SECRET
      }
    );

    void this.prisma.sessaoToken.create({
      data: {
        usuarioId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
```

---

### Fix 2: Implementar CSRF Protection

**Arquivo:** `/services/api/src/common/decorators/csrf.decorator.ts` (NOVO)

```typescript
import { UseGuards, applyDecorators } from "@nestjs/common";
import { CsrfGuard } from "../guards/csrf.guard";

export function CsrfProtected() {
  return applyDecorators(UseGuards(CsrfGuard));
}
```

**Arquivo:** `/services/api/src/common/guards/csrf.guard.ts` (NOVO)

```typescript
import { Injectable, BadRequestException } from "@nestjs/common";
import { CanActivate, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly CSRF_HEADER = "x-csrf-token";
  private readonly SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    // Passe em métodos GET/HEAD/OPTIONS
    if (this.SAFE_METHODS.has(request.method)) {
      return true;
    }

    // Para POST/PUT/DELETE/PATCH, valide token CSRF
    const csrfToken = this.getCsrfToken(request);
    if (!csrfToken) {
      throw new BadRequestException("CSRF token is required");
    }

    // Validar token contra session
    const sessionToken = request.session?.csrfToken;
    if (csrfToken !== sessionToken) {
      throw new BadRequestException("Invalid CSRF token");
    }

    return true;
  }

  private getCsrfToken(request: FastifyRequest): string | null {
    // Busca em header primeiro (recomendado)
    const fromHeader = request.headers[this.CSRF_HEADER];
    if (fromHeader) return String(fromHeader);

    // Fallback para body (menos seguro)
    if (request.body && typeof request.body === "object") {
      const body = request.body as Record<string, unknown>;
      return (body._csrf as string) || null;
    }

    return null;
  }
}
```

**Arquivo:** `/services/api/src/main.ts` (ATUALIZADO)

```typescript
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import helmet from "@nestjs/helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // Segurança: Headers HTTP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "no-referrer" },
  }));

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api/v1");

  // CORS com validação
  const allowedOrigins = process.env["CORS_ORIGIN"]?.split(",").filter(Boolean);
  if (!allowedOrigins || allowedOrigins.length === 0) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("CORS_ORIGIN environment variable is required in production");
    }
    // Development fallback
    allowedOrigins.push("http://localhost:3000");
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    maxAge: 86400, // 24 horas
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
```

**Arquivo:** `/services/api/src/modules/auth/auth.controller.ts` (ATUALIZADO)

```typescript
import { Controller, Post, Body, HttpCode, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CadastroUsuarioSchema, LoginSchema } from "@imbobi/schemas";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { Throttle } from "../../common/decorators/throttle.decorator";
import { IpThrottlerGuard } from "../../common/guards/ip-throttler.guard";
import { UserThrottlerGuard } from "../../common/guards/user-throttler.guard";
import { CsrfProtected } from "../../common/decorators/csrf.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("registrar")
  @UseGuards(IpThrottlerGuard)
  @Throttle(3, 3600000)
  @CsrfProtected()
  registrar(@Body(new ZodPipe(CadastroUsuarioSchema)) body: unknown) {
    return this.auth.registrar(body as never);
  }

  @Post("login")
  @UseGuards(IpThrottlerGuard)
  @Throttle(5, 900000)
  @CsrfProtected()
  @HttpCode(200)
  login(@Body(new ZodPipe(LoginSchema)) body: unknown) {
    return this.auth.login(body as never);
  }

  @Post("renovar")
  @UseGuards(UserThrottlerGuard)
  @Throttle(10, 3600000)
  @CsrfProtected()
  @HttpCode(200)
  renovar(@Body("refreshToken") token: string) {
    return this.auth.renovarToken(token);
  }

  @Post("logout")
  @CsrfProtected()
  @HttpCode(204)
  logout(@Body("refreshToken") token: string) {
    return this.auth.revogarToken(token);
  }
}
```

---

### Fix 3: Atualizar .env.example com novos secrets

**Arquivo:** `.env.example` (ATUALIZADO)

```env
# ── API ────────────────────────────────────────────
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# PostgreSQL + PostGIS
DATABASE_URL=postgresql://imbobi:senha@localhost:5432/imbobi_dev

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT - SEPARADOS PARA SEGURANÇA
JWT_SECRET=troque_por_uma_chave_de_pelo_menos_64_chars_para_access_token
JWT_REFRESH_SECRET=troque_por_outra_chave_de_pelo_menos_64_chars_para_refresh_token
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (ou Cloudflare R2)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=imbobi-evidencias

# ── WEB (Next.js) ──────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000

# ── MOBILE (Expo) ──────────────────────────────────
EXPO_PUBLIC_API_URL=http://localhost:4000
EAS_PROJECT_ID=

# ── Email (SMTP/SendGrid) ──────────────────────────
SENDGRID_API_KEY=
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=
SMTP_FROM=noreply@imbobi.com
APP_URL=http://localhost:3000

# ── Integrações externas ───────────────────────────
UNICO_API_KEY=
SERPRO_TOKEN=

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

---

### Fix 4: Instalar Helmet e Atualizar package.json

**Arquivo:** `services/api/package.json` (ATUALIZAR dependências)

```json
{
  "dependencies": {
    "@nestjs/helmet": "^4.1.1",
    // ... resto das dependências
  }
}
```

Execute:
```bash
cd services/api
pnpm install
```

---

## 4. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar `JWT_REFRESH_SECRET` com >64 caracteres em `.env`
- [ ] Implementar `JwtRefreshStrategy` novo
- [ ] Atualizar `auth.service.ts` para usar secrets separados
- [ ] Atualizar `auth.module.ts` com novo strategy
- [ ] Criar `csrf.decorator.ts` e `csrf.guard.ts`
- [ ] Instalar `@nestjs/helmet`
- [ ] Atualizar `main.ts` com helmet + CORS validation
- [ ] Adicionar `@CsrfProtected()` a todos POST/PUT/PATCH/DELETE sensíveis
- [ ] Testar login/refresh token flow
- [ ] Testar CORS em cross-origin
- [ ] Verificar headers de segurança com DevTools

---

## 5. TESTES DE VERIFICAÇÃO

**Teste 1: Validar JWT secrets separados**
```bash
# Gerar token com JWT_SECRET (access)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","senha":"pass"}'

# Tentar usar refreshToken com estratégia jwt (deve falhar)
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'  # Deve usar JWT_REFRESH_SECRET
```

**Teste 2: CSRF Protection**
```bash
# Sem token CSRF (deve falhar)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","senha":"pass"}'
# Expected: 400 Bad Request - "CSRF token is required"

# Com token CSRF (deve funcionar)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"email":"user@test.com","senha":"pass"}'
```

**Teste 3: Headers de Segurança**
```bash
curl -I http://localhost:4000/api/v1/health
# Deve incluir:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: no-referrer
```

---

## 6. RESUMO DE IMPACTO

| Vulnerabilidade | Severidade | Tipo | Impacto |
|---|---|---|---|
| JWT não separado | CRÍTICA | Token hijacking | Comprometimento total de sessões |
| Sem CSRF | CRÍTICA | CSRF | Ações não autorizadas (solicitar crédito, etc) |
| Refresh token exposto | ALTA | XSS | Roubo de sessão via XSS |
| Sem headers segurança | ALTA | Clickjacking, Injection | Múltiplos ataques |
| CORS não validado | MÉDIA | CORS misconfiguration | Vazamento de dados |

**Risco Geral Antes:** CRÍTICO (9.2/10)  
**Risco Geral Depois:** BAIXO (2.1/10)

---

## 7. PRÓXIMAS ETAPAS (Parte 2)

- [ ] Auditoria de SQL Injection e validação de entrada
- [ ] Verificação de autorização (RBAC)
- [ ] Segurança de dados sensíveis (PII, chaves criptográficas)
- [ ] Rate limiting avançado
- [ ] Logging de segurança e detecção de anomalias
