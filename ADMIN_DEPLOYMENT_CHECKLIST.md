# Admin Dashboard Deployment Checklist

## Pre-Deployment

- [ ] Review ADMIN_GUIDE.md for completeness
- [ ] Test all admin endpoints locally via POSTMAN
- [ ] Verify database schema changes are correct
- [ ] Check audit logging is working properly
- [ ] Verify role-based access control in place
- [ ] Review security measures in ADMIN_GUIDE.md

## Database Migration

- [ ] Backup production database
- [ ] Run migration: `pnpm db:migrate`
  - Creates AuditLog table
  - Adds bloqueado, motivoBloqueio, bloqueadoEm to Usuario
  - Creates necessary indexes
- [ ] Regenerate Prisma client: `pnpm db:generate`
- [ ] Verify migration completed without errors
- [ ] Check new tables/columns exist in database

## Backend Deployment

- [ ] Deploy `AdminModule` changes
  - `services/api/src/modules/admin/admin.module.ts`
  - `services/api/src/modules/admin/admin.service.ts`
  - `services/api/src/modules/admin/admin.controller.ts`
- [ ] Deploy updated `AuditService`:
  - `services/api/src/common/services/audit.service.ts`
- [ ] Deploy updated `AppModule`:
  - `services/api/src/app.module.ts` (includes AdminModule)
- [ ] Verify API compiles without errors
- [ ] Test all `/admin/*` endpoints
- [ ] Verify authentication/authorization working

## Frontend Deployment

- [ ] Deploy admin pages
  - `apps/web/app/(dashboard)/admin/layout.tsx`
  - `apps/web/app/(dashboard)/admin/page.tsx`
  - `apps/web/app/(dashboard)/admin/users/page.tsx`
  - `apps/web/app/(dashboard)/admin/kyc/page.tsx`
  - `apps/web/app/(dashboard)/admin/credits/page.tsx`
  - `apps/web/app/(dashboard)/admin/stages/page.tsx`
  - `apps/web/app/(dashboard)/admin/monitoring/page.tsx`
- [ ] Verify pages load correctly
- [ ] Test navigation between sections
- [ ] Verify API calls work from frontend

## Configuration & Setup

- [ ] Create first ADMIN user (if not exists)
  - Option 1: Via admin panel (if available)
  - Option 2: Direct database insert with ADMIN tipo
- [ ] Test login as ADMIN user
- [ ] Verify non-ADMIN users cannot access /admin
- [ ] Test CSRF protection on POST/PATCH endpoints

## Feature Testing

### User Management
- [ ] List users with pagination
- [ ] Filter by tipo (TOMADOR, GESTOR_OBRA, ADMIN, PARCEIRO)
- [ ] Filter by bloqueado status
- [ ] Filter by kycStatus
- [ ] Block a test user
  - Verify bloqueado = true
  - Verify audit log created
  - Verify motivoBloqueio recorded
- [ ] Unblock the test user
  - Verify bloqueado = false
  - Verify audit log created

### KYC Management
- [ ] Load pending KYC documents
- [ ] Select multiple documents
- [ ] Use "Select All" checkbox
- [ ] Bulk approve documents
  - Verify status changed to APROVADO
  - Verify user.kycStatus updated to APROVADO
  - Verify audit logs created
- [ ] Bulk reject documents with reason
  - Verify status changed to REJEITADO
  - Verify motivo_rejeicao recorded
  - Verify audit logs created

### Credit Management
- [ ] Test approve credit endpoint
  - Verify request format correct
  - Verify response successful
  - Verify audit log created
- [ ] Test reject credit endpoint
  - Verify motivo recorded
  - Verify status changed to SUSPENSO
  - Verify audit log created

### Stage Management
- [ ] Test bulk approve stages
  - Verify status changed to CONCLUIDA
  - Verify dataConclusaoReal set
  - Verify audit logs created

### Dashboard
- [ ] Load dashboard stats
  - Verify numbers are accurate
  - Verify all stats displayed
- [ ] Verify stats update after actions
- [ ] Click stat cards to navigate to sections

### Audit Logs
- [ ] Retrieve audit logs
  - Verify pagination works
  - Verify all actions logged
  - Verify admin ID correct
  - Verify user ID correct
  - Verify acao type correct
  - Verify mudancasAntes/mudancasDepois populated
- [ ] Filter by usuarioId
- [ ] Filter by acao

## Security Testing

- [ ] Verify non-ADMIN cannot access /admin
  - Test with TOMADOR user
  - Test with GESTOR_OBRA user
  - Test with PARCEIRO user
- [ ] Verify unauthenticated users denied
  - Test without JWT token
  - Test with invalid token
- [ ] Verify IP address logged for actions
- [ ] Verify user agent logged for actions
- [ ] Verify error responses don't leak sensitive info
- [ ] Test CSRF protection (if enabled)

## Monitoring & Logs

- [ ] Check application logs for errors
  - Look for any CircularDependency issues
  - Look for PrismaService errors
  - Look for authentication errors
- [ ] Monitor API performance
  - Check response times for new endpoints
  - Check error rates
- [ ] Review recent audit logs for accuracy
- [ ] Check system resource usage (CPU, memory)

## Documentation

- [ ] Verify ADMIN_GUIDE.md is accurate
- [ ] Update internal wiki/docs with admin access info
- [ ] Train admin users on usage
- [ ] Document any custom admin workflows
- [ ] Create runbook for common admin tasks

## Post-Deployment Monitoring (24-48 hours)

- [ ] Monitor for any errors in logs
- [ ] Check audit logs are being created
- [ ] Verify no performance degradation
- [ ] Get feedback from admin users
- [ ] Check for any security issues

## Rollback Plan

If issues occur:

1. Stop deployment
2. Revert admin module code
3. Keep database changes (they're backward compatible)
4. Restart API
5. Verify application still works
6. Investigate root cause
7. Fix and redeploy

Database changes can remain as they don't break existing functionality.

## Success Criteria

- ✅ All API endpoints respond correctly
- ✅ All frontend pages load and work
- ✅ Audit logs created for all admin actions
- ✅ Role-based access control enforced
- ✅ No errors in application logs
- ✅ Admin users can perform all operations
- ✅ Non-admin users denied access
- ✅ Performance is acceptable

## Deployment Commands

```bash
# Backup database (adjust for your setup)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
pnpm db:migrate

# Regenerate Prisma client
pnpm db:generate

# Build backend
pnpm build --filter=@imbobi/api

# Build frontend
pnpm build --filter=web

# Deploy and start services
# (Your deployment process here)
```

## Contact & Support

- Tech Lead: (Add contact info)
- Database Admin: (Add contact info)
- On-Call Support: (Add contact info)

## Sign-off

- [ ] QA Approved
- [ ] Security Approved
- [ ] Database Admin Approved
- [ ] Tech Lead Approved
- [ ] Ready for production deployment
