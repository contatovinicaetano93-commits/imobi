# Web IMOBI — desenvolvimento local

Site oficial: https://imobi-web-ten.vercel.app/

## PowerShell

```powershell
cd "c:\Users\Usuário\Desktop\vini Claude\imobi-push"
pnpm install
Copy-Item apps\web\.env.local.example apps\web\.env.local
# Edite JWT_SECRET (mesmo valor da API staging)
pnpm --filter web dev
```

## WSL

```bash
cd ~/imobi/imobi
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm --filter web dev
```

## Variáveis (Vercel + local)

| Variável | Valor sugerido |
|----------|----------------|
| `NEXT_PUBLIC_API_URL` | URL da API Render staging |
| `JWT_SECRET` | Igual ao da API (obrigatório para login/painéis) |

## Login teste (staging)

| Perfil | Email | Senha |
|--------|-------|-------|
| Tomador | tomador@imobi.com.br | Tomador@123 |
| Gestor | gestor@imobi.com.br | Gestor@123 |
| Admin | admin@imobi.com.br | Admin@123 |

Painéis: `/dashboard`, `/dashboard/gestor`, `/dashboard/admin`
