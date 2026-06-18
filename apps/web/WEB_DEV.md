# Web IMOBI — dev local (Cursor)

## PowerShell (Windows — sem WSL)

```powershell
cd "c:\Users\Usuário\Desktop\vini Claude\imobi"

# Uma vez: instalar pnpm
npm install -g pnpm

# Uma vez: dependencias (demora ~10 min na 1a vez)
pnpm install

# Uma vez: env
Copy-Item apps\web\.env.local.example apps\web\.env.local
# Edite JWT_SECRET no .env.local

# Sempre que for desenvolver
pnpm --filter web dev
```

Abra http://localhost:3000 e http://localhost:3000/simulador

## WSL / Ubuntu (alternativa)

```bash
cd imobi
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter web dev
```

## Modos

| Modo | NEXT_PUBLIC_API_URL | Quando usar |
|------|---------------------|-------------|
| Staging | `https://imobi-api-staging.onrender.com` | Padrao Cursor (sem API local) |
| Local | `http://localhost:4000` | Quando API NestJS estiver rodando |

## Login teste (staging)

| Perfil | Email | Senha |
|--------|-------|-------|
| Tomador | tomador@imobi.com.br | Tomador@123 |
| Gestor | gestor@imobi.com.br | Gestor@123 |
| Admin | admin@imobi.com.br | Admin@123 |

## Rotas publicas

- `/` — landing
- `/simulador` — wizard publico (mock ate API T1.6)
- `/login`, `/cadastro`

## Branch Cursor

`cursor/feat-landing-simulador` — nao editar `services/api/`
