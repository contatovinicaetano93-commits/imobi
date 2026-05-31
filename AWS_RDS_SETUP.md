# AWS RDS Setup Guide (Phase 1B)

## Objective
Migrate from Render PostgreSQL to AWS RDS PostgreSQL 16 with PostGIS extension for location-based queries.

## Prerequisites
- AWS Account (free tier eligible: 750 hours/month t2.micro)
- IAM user with RDS full access permissions
- PostgreSQL 16 client tools (optional, for manual testing)

## Step-by-Step Setup

### 1. Create RDS Instance via AWS Console

1. Go to AWS RDS Dashboard → Create Database
2. **Engine**: PostgreSQL 16.x (latest)
3. **Templates**: Free Tier
4. **DB Instance Identifier**: `imobi-postgres`
5. **Master username**: `imobi_admin`
6. **Master password**: Generate strong password (save in .env.local)
7. **Instance class**: db.t3.micro (free tier)
8. **Storage**: 20 GB (free tier included)
9. **Multi-AZ**: Disable (for free tier)
10. **VPC**: Default VPC
11. **Publicly accessible**: Yes (for development)
12. **Security group**: Create new or allow PostgreSQL (5432)
13. **Initial database name**: `imobi_production`
14. **Enable CloudWatch monitoring**: Yes (free)
15. **Backup retention**: 7 days (free tier)
16. **Delete protection**: Enable (after testing)

### 2. Post-Creation Configuration

After RDS is created (15-30 minutes):

1. Go to RDS Instances → imobi-postgres
2. Copy **Endpoint** (e.g., `imobi-postgres.xxx.us-east-1.rds.amazonaws.com`)
3. Note the **port** (default 5432)

### 3. Connect & Enable PostGIS

```bash
# Install PostgreSQL client (on local machine)
brew install postgresql  # macOS
# or
apt-get install postgresql-client  # Linux

# Connect to RDS
psql -h imobi-postgres.xxx.us-east-1.rds.amazonaws.com \
     -U imobi_admin \
     -d imobi_production

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Verify
SELECT postgis_version();
```

### 4. Update Environment Variables

Add to `.env.local` (development):

```env
# AWS RDS Production Database
DATABASE_URL=postgresql://imobi_admin:<password>@imobi-postgres.xxx.us-east-1.rds.amazonaws.com:5432/imobi_production
DATABASE_URL_BACKUP=postgresql://imobi_postgres_staging_user:6Jahw5tKWOGUVqlmkWNk0xm90kWlGG2W@dpg-d8bmmtmk1jcs73diih60-a.oregon-postgres.render.com/imobi_postgres_staging
```

For production deployment (Render, Vercel, etc.), use AWS Secrets Manager:
```env
DATABASE_URL=$(aws secretsmanager get-secret-value --secret-id imobi/rds/password --query SecretString --output text)
```

### 5. Run Migrations

```bash
# Apply all migrations to RDS
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Verify connection
pnpm db:test
```

### 6. Health Check

```bash
# Test from API
curl http://localhost:4000/health

# Should show database: connected
```

## Cost Estimation (After Free Tier Expires)

| Component | Monthly | Notes |
|-----------|---------|-------|
| RDS t3.micro (730h) | $9-12 | Minimum for production |
| Storage (20GB) | $2-4 | 50GB included free |
| Data transfer | $0-20 | Outbound transfer costs |
| CloudWatch logs | $0-5 | Basic monitoring free |
| **TOTAL** | **$11-41** | |

## Disaster Recovery

### Backup Strategy
- **Automated**: 7-day retention (RDS managed)
- **Manual**: Daily snapshots before major deployments
- **Cross-region**: Enable if multi-region needed

### Failover
- Enable Multi-AZ for production (adds $200+/month, skip for MVP)
- Read replicas in other regions (advanced, skip for MVP)

## Monitoring via CloudWatch

1. RDS Dashboard → Monitoring tab
2. Key metrics:
   - **CPU utilization**: Should stay <50%
   - **Database connections**: Monitor for leaks
   - **Storage space**: Alert if >80%
   - **Read/Write latency**: Should be <5ms

## Security Best Practices

✅ DO:
- Use VPC security groups (restrict to app IP only)
- Store password in AWS Secrets Manager
- Enable automated backups
- Use SSL for connections
- Rotate master password quarterly

❌ DON'T:
- Use weak passwords
- Allow public access unless necessary
- Store credentials in code
- Skip backups

## Migration from Render

Once RDS is ready, parallel testing:

```bash
# Run with Render (current)
DATABASE_URL=$DATABASE_URL_BACKUP npm test

# Run with RDS (new)
DATABASE_URL=$DATABASE_URL npm test

# Compare results
```

## Rollback Plan

If RDS issues occur:
```bash
# Quick rollback to Render
export DATABASE_URL=$DATABASE_URL_BACKUP
pnpm dev  # Uses Render database
```

## Support & Debugging

### Connection Issues
```bash
# Test raw connection
psql -h imobi-postgres.xxx.us-east-1.rds.amazonaws.com -U imobi_admin -d imobi_production

# Check security group
aws ec2 describe-security-groups --query 'SecurityGroups[*].[GroupId,IpPermissions]'

# Verify from your IP
curl https://checkip.amazonaws.com  # Get your IP
```

### Performance Issues
- Check CloudWatch metrics
- Analyze slow query logs
- Consider query optimization before scaling up instance

### PostGIS Queries Not Working
```sql
-- Verify PostGIS is installed
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- If missing, reinstall
DROP EXTENSION postgis CASCADE;
CREATE EXTENSION postgis;
```

## Timeline & Effort

- **RDS Creation**: 15-30 minutes
- **Configuration**: 30 minutes
- **Migration & Testing**: 1 hour
- **Total Phase 1B**: ~2 hours

**Current Status**: Awaiting RDS credentials from user
