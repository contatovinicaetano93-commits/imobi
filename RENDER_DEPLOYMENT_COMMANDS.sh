#!/bin/bash
# imobi — Render Deployment Commands Reference
# Usage: Source this file or copy/paste individual commands
# Date: 2026-06-02

# ============================================================================
# PREREQUISITES
# ============================================================================
# - Access to Render dashboard
# - Connection strings from PostgreSQL and Redis (created on Render)
# - Generated JWT_SECRET and ENCRYPTION_KEY
# - AWS S3 credentials for staging bucket

# ============================================================================
# 1. GENERATE SECRETS (Run locally before deployment)
# ============================================================================

echo "=== Generating JWT_SECRET (64+ chars, base64) ==="
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

echo ""
echo "=== Generating ENCRYPTION_KEY (32 bytes, base64) ==="
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# ============================================================================
# 2. VERIFY ENVIRONMENT VARIABLES
# ============================================================================

verify_env_vars() {
    echo "Checking required environment variables..."

    local required_vars=(
        "DATABASE_URL"
        "REDIS_HOST"
        "REDIS_PORT"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "ERROR: Missing $var"
            return 1
        else
            echo "✓ $var is set"
        fi
    done

    return 0
}

# ============================================================================
# 3. DATABASE CONNECTION TEST
# ============================================================================

# Test PostgreSQL connection from local machine
test_postgres_connection() {
    echo "Testing PostgreSQL connection..."

    if [ -z "$DATABASE_URL" ]; then
        echo "ERROR: DATABASE_URL not set"
        return 1
    fi

    psql "$DATABASE_URL" -c "SELECT version();"

    if [ $? -eq 0 ]; then
        echo "✓ PostgreSQL connection successful"
        return 0
    else
        echo "ERROR: PostgreSQL connection failed"
        return 1
    fi
}

# Test with detailed connection info
test_postgres_verbose() {
    echo "Testing PostgreSQL with verbose output..."
    psql "$DATABASE_URL" \
        -c "\conninfo" \
        -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        -c "\dt"
}

# ============================================================================
# 4. DATABASE MIGRATION COMMANDS
# ============================================================================

# Run before deploying API service (from Render service shell)
migrate_database() {
    echo "Running database migrations..."

    # Generate Prisma client
    pnpm db:generate
    if [ $? -ne 0 ]; then
        echo "ERROR: pnpm db:generate failed"
        return 1
    fi

    # Run migrations
    pnpm db:migrate
    if [ $? -ne 0 ]; then
        echo "ERROR: pnpm db:migrate failed"
        return 1
    fi

    echo "✓ Migrations completed successfully"
    return 0
}

# Check migration status
check_migrations() {
    echo "Checking migration status..."
    pnpm prisma:studio
}

# ============================================================================
# 5. PRISMA STUDIO - VISUAL DATABASE INSPECTION
# ============================================================================

open_prisma_studio() {
    echo "Opening Prisma Studio..."
    echo "This will connect to your database and show all tables"
    echo ""

    DATABASE_URL="$DATABASE_URL" pnpm prisma:studio

    echo ""
    echo "Prisma Studio is running at: http://localhost:5555"
    echo "Expected tables:"
    echo "  - Usuario"
    echo "  - Credito"
    echo "  - Obra"
    echo "  - EtapaObra"
    echo "  - EvidenciaEtapa"
    echo "  - LiberacaoParcela"
    echo "  - KycDocumento"
    echo "  - Notificacao"
    echo "  - ScoreHistorico"
    echo "  - JobFalha"
    echo "  - AnalyticsEvent"
}

# ============================================================================
# 6. SEED TEST DATA (OPTIONAL)
# ============================================================================

seed_test_data() {
    echo "Seeding test data into database..."

    pnpm --filter @imbobi/api seed

    if [ $? -eq 0 ]; then
        echo "✓ Test data seeded successfully"
        echo ""
        echo "Created sample data:"
        echo "  - Test users (tomador, gestor, admin)"
        echo "  - Test projects (obras)"
        echo "  - Test credits"
        return 0
    else
        echo "ERROR: Seed failed"
        return 1
    fi
}

# ============================================================================
# 7. VERIFY ALL TABLES CREATED
# ============================================================================

verify_tables_created() {
    echo "Verifying database tables..."

    psql "$DATABASE_URL" -t -c "
        SELECT string_agg(tablename, ', ' ORDER BY tablename)
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    "

    echo ""
    echo "Table count:"
    psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) as table_count
        FROM pg_tables
        WHERE schemaname = 'public';
    "
}

# ============================================================================
# 8. BACKUP DATABASE (BEFORE MIGRATIONS)
# ============================================================================

backup_database() {
    echo "Creating database backup..."

    if [ -z "$DATABASE_URL" ]; then
        echo "ERROR: DATABASE_URL not set"
        return 1
    fi

    local backup_file="imobi_staging_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

    pg_dump "$DATABASE_URL" | gzip > "$backup_file"

    if [ -f "$backup_file" ]; then
        echo "✓ Backup created: $backup_file"
        echo "  Size: $(du -h "$backup_file" | cut -f1)"

        # Optionally upload to S3
        echo ""
        echo "To upload to S3:"
        echo "  aws s3 cp $backup_file s3://imobi-backups/staging/"
        return 0
    else
        echo "ERROR: Backup creation failed"
        return 1
    fi
}

# ============================================================================
# 9. RESTORE FROM BACKUP
# ============================================================================

restore_database_from_backup() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        echo "Usage: restore_database_from_backup <backup_file>"
        echo "Example: restore_database_from_backup imobi_staging_backup_20260602_120000.sql.gz"
        return 1
    fi

    if [ ! -f "$backup_file" ]; then
        echo "ERROR: Backup file not found: $backup_file"
        return 1
    fi

    echo "Restoring from backup: $backup_file"
    echo "WARNING: This will overwrite the current database"
    read -p "Continue? (yes/no) " -n 3 -r
    echo

    if [[ ! $REPLY =~ ^yes$ ]]; then
        echo "Restore cancelled"
        return 1
    fi

    gunzip < "$backup_file" | psql "$DATABASE_URL"

    if [ $? -eq 0 ]; then
        echo "✓ Restore completed successfully"
        return 0
    else
        echo "ERROR: Restore failed"
        return 1
    fi
}

# ============================================================================
# 10. HEALTH CHECK - API CONNECTION TEST
# ============================================================================

test_api_health() {
    local api_url=${1:-"http://localhost:4000"}

    echo "Testing API health at: $api_url/health"

    response=$(curl -s -w "\n%{http_code}" "$api_url/health")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" == "200" ]; then
        echo "✓ API is healthy"
        echo "Response: $body"
        return 0
    else
        echo "ERROR: API returned HTTP $http_code"
        echo "Response: $body"
        return 1
    fi
}

# ============================================================================
# 11. MONITORING - CHECK DATABASE CONNECTIONS
# ============================================================================

check_db_connections() {
    echo "Current database connections:"

    psql "$DATABASE_URL" -c "
        SELECT
            datname as database,
            count(*) as connections,
            max_conn
        FROM pg_stat_activity
        RIGHT JOIN (
            SELECT datname,
                   setting::int as max_conn
            FROM pg_settings,
                 pg_database
            WHERE name = 'max_connections'
              AND pg_database.datname = current_database()
        ) USING (datname)
        GROUP BY datname, max_conn;
    "
}

# ============================================================================
# 12. MONITORING - CHECK DATABASE SIZE
# ============================================================================

check_db_size() {
    echo "Database size:"

    psql "$DATABASE_URL" -c "
        SELECT
            pg_database.datname as database,
            pg_size_pretty(pg_database_size(datname)) as size
        FROM pg_database
        WHERE datname = current_database();
    "

    echo ""
    echo "Table sizes:"
    psql "$DATABASE_URL" -c "
        SELECT
            schemaname as schema,
            tablename as table,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "
}

# ============================================================================
# 13. CLEANUP - RESET DATABASE (DESTRUCTIVE)
# ============================================================================

reset_database() {
    echo "WARNING: This will DELETE all data from the database"
    read -p "Type 'reset-staging' to confirm: " confirmation

    if [ "$confirmation" != "reset-staging" ]; then
        echo "Reset cancelled"
        return 1
    fi

    echo "Dropping all tables..."
    psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

    echo "Running migrations to recreate schema..."
    pnpm db:migrate

    echo "✓ Database reset complete"
}

# ============================================================================
# 14. DEPLOY COMMANDS FOR RENDER
# ============================================================================

# Push to staging branch to trigger auto-deploy
deploy_to_staging() {
    echo "Deploying to staging environment..."

    git status
    echo ""
    read -p "Push to staging branch? (yes/no) " -n 3 -r

    if [[ $REPLY =~ ^yes$ ]]; then
        git push origin staging
        echo "✓ Pushed to staging branch"
        echo ""
        echo "Render will auto-deploy (if configured)"
        echo "Monitor progress: https://dashboard.render.com"
    fi
}

# ============================================================================
# 15. RENDER SERVICE LOGS
# ============================================================================

# View logs from Render (requires render CLI or SSH)
# For now, use Render dashboard: https://dashboard.render.com → Service → Logs

show_log_hints() {
    echo "To view Render service logs:"
    echo ""
    echo "1. Web UI (easiest):"
    echo "   - Go to https://dashboard.render.com"
    echo "   - Select your service (imobi-api-staging)"
    echo "   - Click 'Logs' tab"
    echo ""
    echo "2. Search for errors:"
    echo "   - 'Database connection failed'"
    echo "   - 'Redis connection failed'"
    echo "   - 'Cannot find module'"
    echo "   - 'Migration failed'"
}

# ============================================================================
# 16. RENDER SERVICE SHELL - EXECUTE COMMANDS
# ============================================================================

show_shell_hints() {
    echo "To run commands in Render service:"
    echo ""
    echo "1. Web UI:"
    echo "   - https://dashboard.render.com"
    echo "   - Select service"
    echo "   - Click 'Shell' tab"
    echo "   - Run commands (pnpm db:migrate, etc.)"
    echo ""
    echo "2. Commands available:"
    echo "   - pnpm db:generate"
    echo "   - pnpm db:migrate"
    echo "   - pnpm prisma:studio"
    echo "   - npm run seed"
}

# ============================================================================
# 17. QUICK REFERENCE - ALL STEPS
# ============================================================================

deployment_checklist() {
    cat << 'EOF'
imobi Render Deployment Checklist
==================================

PRE-DEPLOYMENT:
  [ ] Generate JWT_SECRET (command: see above)
  [ ] Generate ENCRYPTION_KEY (command: see above)
  [ ] Get PostgreSQL connection string from Render
  [ ] Get Redis connection string from Render
  [ ] Create AWS S3 staging bucket credentials

CREATE SERVICES ON RENDER:
  [ ] PostgreSQL instance created
  [ ] Redis instance created
  [ ] API service created and configured

CONFIGURE API SERVICE:
  [ ] Set DATABASE_URL
  [ ] Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
  [ ] Set JWT_SECRET
  [ ] Set ENCRYPTION_KEY
  [ ] Set CORS_ORIGIN
  [ ] Set AWS credentials
  [ ] Set Firebase credentials (if enabled)

FIRST DEPLOYMENT:
  [ ] Render service auto-deploys (or manual deploy)
  [ ] Build succeeds (check Logs tab)
  [ ] Service shows "Live" status

DATABASE MIGRATIONS:
  [ ] Access service Shell
  [ ] Run: pnpm db:generate
  [ ] Run: pnpm db:migrate
  [ ] Verify all tables created
  [ ] (Optional) Seed test data

VERIFICATION:
  [ ] curl https://api.staging/health returns 200
  [ ] Prisma Studio connects to database
  [ ] No connection errors in logs
  [ ] Database connections < 10
  [ ] Redis memory < 100MB

MONITORING:
  [ ] Set up PostgreSQL alerts
  [ ] Set up Redis alerts
  [ ] Enable API health checks
  [ ] Enable automated backups

PRODUCTION-LIKE TEST:
  [ ] Test user registration (POST /api/v1/auth/register)
  [ ] Test login (POST /api/v1/auth/login)
  [ ] Test project creation (POST /api/v1/obras)
  [ ] Test payment release job (BullMQ queue)
  [ ] Monitor database under load

DOCUMENTATION:
  [ ] Backup connection strings securely
  [ ] Document all generated secrets
  [ ] Create runbook for troubleshooting
  [ ] Test disaster recovery procedure

EOF
}

# ============================================================================
# MAIN - Display all available functions
# ============================================================================

show_help() {
    cat << 'EOF'
imobi Render Deployment Commands

Usage: Source this script or call individual functions

Available functions:
  - verify_env_vars()             Check all required env vars are set
  - test_postgres_connection()    Test PostgreSQL connection
  - test_postgres_verbose()       Verbose PostgreSQL test
  - migrate_database()            Run Prisma migrations
  - check_migrations()            Open Prisma Studio
  - open_prisma_studio()          Visual database inspection
  - seed_test_data()              Load test data
  - verify_tables_created()       Check tables exist
  - backup_database()             Create database backup
  - restore_database_from_backup()  Restore from backup file
  - test_api_health()             Test API /health endpoint
  - check_db_connections()        Monitor active connections
  - check_db_size()               Check database size
  - reset_database()              DESTRUCTIVE: Clear all data
  - deploy_to_staging()           Push to staging branch
  - show_log_hints()              How to view Render logs
  - show_shell_hints()            How to use Render Shell
  - deployment_checklist()        Full deployment checklist

Examples:
  source RENDER_DEPLOYMENT_COMMANDS.sh
  verify_env_vars
  test_postgres_connection
  migrate_database
  test_api_health "https://api-staging.onrender.com"

EOF
}

# Show help by default if script is run (not sourced)
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    show_help
fi

# Display deployment checklist
echo ""
deployment_checklist
