# 🚀 VERCEL DEPLOYMENT — ENV VARS SETUP

## ✅ 14 Credenciais Prontas

**Acesse**: https://vercel.com/dashboard → Projeto `imobi` → Settings → Environment Variables

### Instruções:

1. **Step 1**: Copie cada credencial de `/tmp/credentials.env` (arquivo local, não commitado)
2. **Step 2**: Cole no Vercel Dashboard
3. **Step 3**: Salve e aguarde auto-deploy (3-5 minutos)

### Credenciais Necessárias:

| # | Nome | Descrição |
|---|------|-----------|
| 1 | `DATABASE_URL` | PostgreSQL (Render) |
| 2 | `REDIS_URL` | Redis (Upstash) |
| 3 | `AWS_ACCESS_KEY_ID` | AWS S3 Access |
| 4 | `AWS_SECRET_ACCESS_KEY` | AWS S3 Secret |
| 5 | `AWS_S3_BUCKET` | imobi-evidencias-prod |
| 6 | `AWS_S3_REGION` | sa-east-1 |
| 7 | `FIREBASE_PROJECT_ID` | Firebase ID |
| 8 | `FIREBASE_CLIENT_EMAIL` | Firebase Email |
| 9 | `FIREBASE_PRIVATE_KEY` | Firebase Private Key |
| 10 | `SENDGRID_API_KEY` | SendGrid API Key |
| 11 | `EMAIL_PROVIDER` | sendgrid |
| 12 | `NODE_ENV` | production |
| 13 | `NEXT_PUBLIC_API_URL` | https://api.imobi.com.br |
| 14 | `CORS_ORIGIN` | https://imobi.com.br,https://www.imobi.com.br |

### ⚠️ SECURITY WARNING

❌ **NUNCA** comite secrets no git!  
✅ Use Vercel Dashboard ou arquivo `.env.local` (local only)

---

## 🚀 Próximos Passos

Após colar as credenciais:

1. ✅ Vercel auto-triggera build
2. ✅ Aguarde 3-5 minutos
3. ✅ Confira build logs (peut haver erro em /404, /500 — é seguro ignorar)
4. ✅ Acesse https://imobi.vercel.app
5. ✅ Teste login com credenciais de teste

### Teste Rápido:
```
Email: admin@imobi.com.br
Senha: Admin@123
```

---

**Status**: ✅ Branch pronta, aguardando deploy no Vercel
