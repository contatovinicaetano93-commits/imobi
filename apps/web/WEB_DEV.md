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

| Perfil | Email | Senha | Painel |
|--------|-------|-------|--------|
| Tomador | tomador@imobi.com.br | Tomador@123 | `/dashboard` |
| Gestor do Fundo | gestor@imobi.com.br | Gestor@123 | `/dashboard/gestor` |
| Admin | admin@imobi.com.br | Admin@123 | `/dashboard/admin` |

## Render (API) — obrigatório após push

O site (Vercel) e a API (Render) deployam **separados**. Se o painel gestor der **403**, a API no Render está com build antigo.

1. [Render Dashboard](https://dashboard.render.com) → serviço `imobi-api-efgg` (ou `imobi-api`)
2. **Manual Deploy** → Deploy latest commit (`main`)
3. Aguarde build + migration
4. Teste: `GET https://imobi-api-efgg.onrender.com/api/v1/health` → 200
5. Logout/login no site e abra `/dashboard/gestor` de novo
