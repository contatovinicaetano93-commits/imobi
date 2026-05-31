# RDS PostGIS Setup - Execute na sua máquina local

## Credenciais RDS
```
Host: imobi-database.cluster-cjjqcu6m20ok.us-east-2.rds.amazonaws.com
Port: 5432
Database: imobi_production
User: imobi_admin
Password: Paula110193@
```

## Passo 1: Instalar PostgreSQL Client (se não tiver)

**macOS:**
```bash
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download: https://www.postgresql.org/download/windows/

## Passo 2: Ativar PostGIS

Execute o arquivo `enable-postgis.sql`:

```bash
psql -h imobi-database.cluster-cjjqcu6m20ok.us-east-2.rds.amazonaws.com \
     -U imobi_admin \
     -d imobi_production \
     -f enable-postgis.sql
```

When prompted, enter password: `Paula110193@`

**Ou** copie e cole os comandos manualmente:

```bash
psql -h imobi-database.cluster-cjjqcu6m20ok.us-east-2.rds.amazonaws.com \
     -U imobi_admin \
     -d imobi_production
```

Then run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
SELECT postgis_version();
\q
```

## Passo 3: Rodar Migrations

Na pasta do projeto:

```bash
cd /home/user/imobi
pnpm db:migrate
pnpm db:generate
```

## Passo 4: Verificar Conexão

```bash
pnpm dev
```

Deve conectar ao RDS sem erros.

## Passo 5: Rodar KYC Tests

```bash
cd services/api
pnpm test -- kyc.e2e.spec.ts
```

Esperado: **27/27 testes passando** ✅

---

**Status**: RDS criado, PostGIS pronto, migrations prontas
