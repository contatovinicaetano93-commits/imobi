# 🚀 QUICK START — Provisioning em 30-45 minutos

**Objetivo**: Provisionar infraestrutura e coletar 15 credenciais para production

---

## 📋 CHECKLIST

- [ ] PostgreSQL (Railway) — 5 min
- [ ] Redis (Upstash) — 5 min
- [ ] S3 Bucket (AWS) — 10 min
- [ ] Firebase (Google) — 10 min
- [ ] SendGrid API Key — 5 min
- [ ] **Total**: 35 minutos

---

## FASE 1: PostgreSQL + PostGIS (Railway) — 5 min

### Step 1: Criar Railway Account
```
1. Ir para: https://railway.app
2. Login com GitHub
3. Criar novo projeto
```

### Step 2: Adicionar PostgreSQL
```
1. New Project → Add Service → PostgreSQL
2. Aguardar criação (~30s)
```

### Step 3: Configurar Banco
```
1. Clicar no serviço PostgreSQL
2. Ir para aba "Variables"
3. Ver credenciais:
   - PGHOST
   - PGPORT
   - PGUSER
   - PGPASSWORD
   - PGDATABASE (copiar como "postgres" ou deixar vazio)
```

### Step 4: Habilitar PostGIS
```
# Conectar via psql (local ou CLI do Railway)
psql postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}

# Dentro do psql:
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT postgis_version();
# Deve retornar: "3.4.x"
```

### Step 5: Coletar DATABASE_URL
```
DATABASE_URL = "postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}?schema=public"

Exemplo:
DATABASE_URL="postgresql://postgres:abc123@containers-us-west-108.railway.app:5432/railway?schema=public"
```

**✅ SALVAR**: `DATABASE_URL`

---

## FASE 2: Redis (Upstash) — 5 min

### Step 1: Criar Upstash Account
```
1. Ir para: https://upstash.com
2. Login com GitHub
3. Databases → Create Database
```

### Step 2: Configurar Redis
```
1. Name: imbobi-prod
2. Region: US-East-1
3. Eviction: allkeys-lru
4. Persistence: RDB (habilitada)
5. TLS: On (padrão)
6. Criar
```

### Step 3: Coletar Credenciais
```
1. Clicar no banco criado
2. Ir para aba "Connect"
3. Copiar: "UPSTASH_REDIS_REST_URL" e "UPSTASH_REDIS_REST_TOKEN"
   OU "Redis CLI" tab para REDIS_URL completa
```

### Step 4: Coletar REDIS_URL
```
REDIS_URL = "redis://:TOKEN@HOSTNAME:PORT"

Exemplo:
REDIS_URL="redis://:AeChQDFaxyz@us1-adequate-cod-12345.upstash.io:38571"
```

**✅ SALVAR**: `REDIS_URL`

---

## FASE 3: AWS S3 + IAM (10 min)

### Step 1: Abrir AWS Console
```
1. Ir para: https://console.aws.amazon.com
2. Login com sua conta AWS
3. Se não tiver: criar em https://aws.amazon.com (leva ~5 min)
```

### Step 2: Criar S3 Bucket
```bash
# Via CLI (se tiver aws cli instalado):
aws s3api create-bucket \
  --bucket imobi-evidencias-prod \
  --region us-east-1

# Ou via Console:
1. S3 → Create Bucket
2. Name: imobi-evidencias-prod
3. Region: us-east-1
4. Create
```

### Step 3: Habilitar Versionamento
```bash
aws s3api put-bucket-versioning \
  --bucket imobi-evidencias-prod \
  --versioning-configuration Status=Enabled

# Ou via Console:
1. Bucket → Properties → Versioning → Enable
```

### Step 4: Habilitar Encriptação
```bash
aws s3api put-bucket-encryption \
  --bucket imobi-evidencias-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Step 5: Configurar CORS
```bash
aws s3api put-bucket-cors \
  --bucket imobi-evidencias-prod \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://app.imobi.com.br", "https://api.imobi.com.br"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### Step 6: Criar IAM User
```bash
aws iam create-user --user-name imobi-s3-user

# Salvar output: ARN será algo como:
# arn:aws:iam::123456789012:user/imobi-s3-user
```

### Step 7: Criar Policy S3
```bash
aws iam put-user-policy \
  --user-name imobi-s3-user \
  --policy-name imobi-s3-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::imobi-evidencias-prod/*"
    }]
  }'
```

### Step 8: Gerar Access Keys
```bash
aws iam create-access-key --user-name imobi-s3-user

# Output (GUARDAR AGORA - não pode recuperar depois):
# AccessKeyId: AKIA...
# SecretAccessKey: xxxxxxxxxxxx
```

### Step 9: Testar Upload
```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="xxxx..."

echo "test" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://imobi-evidencias-prod/test.txt

# Deve retornar: upload: /tmp/test.txt to s3://imobi-evidencias-prod/test.txt

aws s3 rm s3://imobi-evidencias-prod/test.txt
```

**✅ SALVAR**:
```
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="imobi-evidencias-prod"
AWS_REGION="us-east-1"
```

---

## FASE 4: Firebase Cloud Messaging (10 min)

### Step 1: Criar Firebase Project
```
1. Ir para: https://console.firebase.google.com
2. "+ Create project"
3. Name: imbobi-prod
4. Region: us-east-1
5. Create project
```

### Step 2: Habilitar Cloud Messaging
```
1. Project Settings → Cloud Messaging
2. Verificar que está habilitado (padrão)
```

### Step 3: Gerar Service Account Key
```
1. Project Settings → Service Accounts
2. "Generate New Private Key"
3. Salvar como: firebase-key.json
```

### Step 4: Extrair Credenciais
```bash
# Abrir firebase-key.json e copiar:

FIREBASE_PROJECT_ID=$(cat firebase-key.json | jq -r '.project_id')
# Exemplo: imbobi-prod

FIREBASE_CLIENT_EMAIL=$(cat firebase-key.json | jq -r '.client_email')
# Exemplo: firebase-adminsdk-abc@imbobi-prod.iam.gserviceaccount.com

FIREBASE_PRIVATE_KEY=$(cat firebase-key.json | jq -r '.private_key')
# Exemplo: -----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n
```

**✅ SALVAR**:
```
FIREBASE_PROJECT_ID="imbobi-prod"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@imbobi-prod.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

---

## FASE 5: SendGrid API Key (5 min)

### Step 1: Criar SendGrid Account
```
1. Ir para: https://sendgrid.com
2. Sign Up (use email corporativo)
3. Verify email
```

### Step 2: Gerar API Key
```
1. Settings → API Keys
2. "Create API Key"
3. Name: imobi-prod
4. Permissions: Mail Send only
5. Create & copy
```

**✅ SALVAR**:
```
SENDGRID_API_KEY="SG.xxxxxxxxxxxxx"
EMAIL_PROVIDER="sendgrid"
```

---

## 📦 COMPILAR CREDENCIAIS

Cole aqui as 15 credenciais finais (copie/cole tudo):

```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=imobi-evidencias-prod
AWS_REGION=us-east-1

# Firebase
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@imbobi-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG....

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.imbobi.com.br
CORS_ORIGIN=https://imobi.com.br,https://www.imobi.com.br
```

---

## ✅ VERIFICAÇÃO FINAL

```bash
# 1. Database
psql "$DATABASE_URL" -c "SELECT 1;"
# Expected: (1 row)

# 2. Redis (local teste)
redis-cli -u "$REDIS_URL" ping
# Expected: PONG

# 3. S3 (já testou acima)
# ✓

# 4. Firebase (será testado em deploy)
# ✓

# 5. SendGrid (será testado em deploy)
# ✓
```

---

## 🎯 PRÓXIMO PASSO

**Quando tiver todas as 15 credenciais:**

1. Copie tudo acima
2. Me mande: "Credenciais prontas - [cole credenciais acima]"
3. Eu vou:
   - ✅ Set env vars no Vercel
   - ✅ Deploy em produção
   - ✅ Rodar E2E tests
   - ✅ Setup monitoring
   - ✅ Relatório final

**Tempo total**: ~60 min (você 30-45 min + eu 30 min)

---

**Começe agora!** ⏱️
