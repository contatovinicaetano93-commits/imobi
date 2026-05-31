# RDS PostgreSQL Setup - 5 Passos Rápidos

## Login AWS Console
1. Acesse: https://047556738507.signin.aws.amazon.com/console
2. Username: `imobi-deplou`
3. Password: `rQA7_v13`

## Passo 1: Criar RDS Instance (2 min)
1. Go to **RDS Dashboard** → **Create database**
2. **Engine**: PostgreSQL
3. **Version**: 16.1 (latest)
4. **Templates**: Free tier
5. **DB Instance Identifier**: `imobi-postgres`
6. **Master username**: `imobi_admin`
7. **Master password**: Generate (salve em lugar seguro) ou use: `SecurePass123!`
8. **Instance class**: db.t3.micro ✓
9. **Storage**: 20 GB (gp2)
10. **Publicly accessible**: YES
11. **VPC**: Default
12. **Subnet group**: default (create if needed)
13. **Security group**: Create new → `imobi-rds-sg`
14. **Backup retention**: 7 days
15. Click **Create database**

## Passo 2: Aguardar criação (10 min)
Status muda: Creating → Available
Copie o **Endpoint** quando ficar Available (exemplo: `imobi-postgres.xxxxx.us-east-2.rds.amazonaws.com`)

## Passo 3: Ativar PostGIS (2 min)
```bash
# Instale psql (se não tiver)
brew install postgresql  # macOS
# ou
apt-get install postgresql-client  # Linux

# Conecte ao RDS
psql -h imobi-postgres.xxxxx.us-east-2.rds.amazonaws.com \
     -U imobi_admin \
     -d imobi_production

# No psql prompt (senha quando pedir):
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SELECT postgis_version();
\q
```

## Passo 4: Atualizar .env.local
```bash
# Copie o endpoint e rode:
cat >> .env.local << 'EOF2'

# AWS RDS PostgreSQL (LIVE)
DATABASE_URL=postgresql://imobi_admin:SecurePass123!@imobi-postgres.xxxxx.us-east-2.rds.amazonaws.com:5432/imobi_production
EOF2
```

## Passo 5: Rodar Migrations
```bash
cd /home/user/imobi
pnpm db:migrate
pnpm db:generate
pnpm dev
```

---

## Verificação
```bash
# Teste connection
psql -h imobi-postgres.xxxxx.us-east-2.rds.amazonaws.com \
     -U imobi_admin \
     -d imobi_production \
     -c "SELECT version();"

# Deve mostrar PostgreSQL 16.x
```

## Troubleshooting

**Connection refused?**
- Aguarde 2-3 min após criar (RDS precisa inicializar)
- Verifique security group permite port 5432

**Password error?**
- Confirme sem typos
- Use aspas se tiver caracteres especiais

**PostGIS not found?**
- RDS pode não ter PostGIS pré-instalado
- Tente: `CREATE EXTENSION postgis;` (sem IF NOT EXISTS)

---
**Tempo total**: ~15 minutos
**Próximo**: Migrations rodam automático, KYC E2E tests devem passar
