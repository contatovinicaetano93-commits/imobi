# imobi — Complete Setup Guide for Windows WSL 2

## Option 1: Local PostgreSQL (Recommended for Testing)

### Step 1: Install PostgreSQL in WSL 2
```bash
# In WSL 2 terminal
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo service postgresql start

# Verify
pg_isready
```

### Step 2: Create Database & User
```bash
sudo -u postgres psql

-- In psql:
CREATE DATABASE imbobi_dev;
CREATE USER imbobi WITH PASSWORD 'imbobi123';
ALTER ROLE imbobi SET client_encoding TO 'utf8';
ALTER ROLE imbobi SET default_transaction_isolation TO 'read committed';
ALTER ROLE imbobi SET default_transaction_deferrable TO on;
ALTER ROLE imbobi SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE imbobi_dev TO imbobi;
\q
```

### Step 3: Create .env File
```bash
cd /home/user/imobi/services/api

# Create .env with:
cat > .env << 'ENVFILE'
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://imbobi:imbobi123@localhost:5432/imbobi_dev?schema=public"
JWT_SECRET="your-super-secret-jwt-key-minimum-64-characters-long-generate-new-one"
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGIN="http://localhost:3000,http://localhost:8081"
ENVFILE
```

### Step 4: Run Database Migrations
```bash
cd /home/user/imobi
pnpm db:migrate
```

### Step 5: Start Services
```bash
# Terminal 1: Web
pnpm --filter @imbobi/web dev

# Terminal 2: API
pnpm --filter @imbobi/api start

# Terminal 3: Mobile (Expo tunnel)
pnpm --filter @imbobi/mobile run dev -- --tunnel
```

---

## Option 2: Docker Compose (Easiest)

```bash
cd /home/user/imobi

cat > docker-compose.yml << 'DCFILE'
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: imbobi
      POSTGRES_PASSWORD: imbobi123
      POSTGRES_DB: imbobi_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
DCFILE

# Start services
docker-compose up -d

# Run migrations
sleep 5  # Wait for DB to start
pnpm db:migrate
```

---

## Option 3: AWS RDS (Production-Ready)

1. **Create RDS PostgreSQL Instance:**
   - Engine: PostgreSQL 16.x
   - DB instance class: db.t4g.micro (free tier eligible)
   - Storage: 20 GB gp3
   - Public accessibility: Yes (for dev)
   - No backup retention for dev

2. **Create Database & User:**
```sql
CREATE DATABASE imbobi_dev;
CREATE USER imbobi WITH PASSWORD 'GenerateSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE imbobi_dev TO imbobi;
```

3. **Update .env:**
```
DATABASE_URL="postgresql://imbobi:PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/imbobi_dev?schema=public"
```

---

## Verification Checklist

After setup, verify everything works:

```bash
# 1. Database connection
psql "postgresql://imbobi:imbobi123@localhost:5432/imbobi_dev" -c "SELECT 1;"

# 2. Run migrations
pnpm db:migrate

# 3. Start API
pnpm --filter @imbobi/api start
# Should show: "imbobi API running on port 4000"

# 4. Test signup endpoint
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "email": "test@example.com",
    "senha": "TestPass123",
    "tipo": "TOMADOR"
  }'

# 5. Test web signup form at http://localhost:3000/cadastro
```

---

## Environment Variables Reference

```env
# API
NODE_ENV=development|staging|production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=min-64-chars-random-string
ENCRYPTION_KEY=base64-encoded-32-bytes

# Database
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081

# Optional (Email, Storage, Firebase)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password

AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=imbobi-assets

FIREBASE_PROJECT_ID=your-project
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=firebase@your-project.iam.gserviceaccount.com
```

---

## Troubleshooting

### PostgreSQL Connection Refused
- Check if PostgreSQL is running: `pg_isready`
- Start it: `sudo service postgresql start`
- Verify credentials in .env

### Port 5432 Already in Use
```bash
# Find what's using the port
lsof -i :5432

# Kill it if needed
kill -9 <PID>

# Or use different port: postgresql://user:pass@localhost:5433/db
```

### Migration Fails
```bash
# Regenerate Prisma client
pnpm db:generate

# Try migration again
pnpm db:migrate
```

### API Still Won't Start
- Check .env file exists and has DATABASE_URL
- Verify database is accessible: `psql $DATABASE_URL -c "SELECT 1;"`
- Check logs: `tail -100 /tmp/api.log`

