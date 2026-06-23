# Security Hardening Checklist — Imobi Production

**Date**: June 23, 2026  
**Status**: Pre-Launch Security Review  
**Classification**: Internal Use Only

---

## Executive Summary

This document ensures the Imobi fintech platform meets security best practices before going live. All items must be completed and verified before production launch.

**Critical Items** (Must complete before launch): 15  
**High Items** (Should complete before launch): 12  
**Medium Items** (Complete within 2 weeks): 8  
**Low Items** (Complete within 30 days): 6

---

## 1. HTTPS & TLS Configuration

### 1.1 Frontend HTTPS

- [ ] **CRITICAL**: Frontend served exclusively over HTTPS
  ```bash
  curl -I http://imobi.com.br
  # Expected: 301/302 redirect to https://
  
  curl -I https://imobi.com.br
  # Expected: 200 OK
  ```

- [ ] **CRITICAL**: HSTS (HTTP Strict Transport Security) enabled
  ```bash
  curl -I https://imobi.com.br | grep "Strict-Transport-Security"
  # Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

- [ ] **HIGH**: SSL/TLS certificate valid and trusted
  ```bash
  openssl s_client -connect imobi.com.br:443 | grep "Verify return code"
  # Expected: "Verify return code: 0 (ok)"
  
  # Check expiration
  openssl s_client -connect imobi.com.br:443 | grep "Not After"
  # Expected: Date > 6 months from now
  ```

- [ ] **MEDIUM**: Minimum TLS version 1.2
  ```bash
  # Verify in Vercel settings:
  # Dashboard → Settings → Security
  # Expected: TLS 1.2+ only
  ```

### 1.2 Backend HTTPS

- [ ] **CRITICAL**: API served exclusively over HTTPS
  ```bash
  curl -I http://api.imobi.com.br/api/v1/health
  # Expected: 301/302 redirect to https://
  ```

- [ ] **HIGH**: API has valid SSL certificate
  ```bash
  openssl s_client -connect api.imobi.com.br:443 | grep "CN="
  # Expected: CN=api.imobi.com.br or wildcard
  ```

---

## 2. CORS (Cross-Origin Resource Sharing)

### 2.1 CORS Configuration

- [ ] **CRITICAL**: CORS origin whitelist configured (NOT *)
  ```bash
  grep "CORS_ORIGIN" .env.production
  # Expected: CORS_ORIGIN="https://imobi.com.br,https://app.imobi.com.br"
  # ❌ NEVER: CORS_ORIGIN="*"
  ```

- [ ] **CRITICAL**: Verify CORS headers are correct
  ```bash
  curl -H "Origin: https://imobi.com.br" \
    https://api.imobi.com.br/api/v1/health -v | \
    grep "Access-Control-Allow-Origin"
  # Expected: Access-Control-Allow-Origin: https://imobi.com.br
  ```

- [ ] **HIGH**: Requests from unauthorized origins are blocked
  ```bash
  curl -H "Origin: https://evil.com" \
    https://api.imobi.com.br/api/v1/health -v | \
    grep "Access-Control-Allow-Origin"
  # Expected: (no header - request blocked at browser level)
  ```

- [ ] **MEDIUM**: CORS preflight requests working
  ```bash
  curl -X OPTIONS https://api.imobi.com.br/api/v1/test \
    -H "Origin: https://imobi.com.br" \
    -H "Access-Control-Request-Method: POST" -v
  # Expected: 200 OK with CORS headers
  ```

---

## 3. Authentication & Authorization

### 3.1 JWT Token Security

- [ ] **CRITICAL**: JWT_SECRET is strong and unique
  ```bash
  # Verify in code:
  # services/api/src/config/auth.ts
  # JWT_SECRET must be:
  # - 64+ characters
  # - Alphanumeric + symbols
  # - NOT default or documented value
  # - NEVER in git history
  ```

- [ ] **CRITICAL**: JWT tokens have expiration
  ```bash
  # In code: services/api/src/modules/auth/jwt.strategy.ts
  # Expected: JWT_EXPIRES_IN = 15m (short-lived access token)
  # Expected: JWT_REFRESH_EXPIRES_IN = 7d (refresh token valid 7 days)
  ```

- [ ] **HIGH**: Refresh token rotation implemented
  ```bash
  # Test flow:
  # 1. Get access token
  # 2. Get refresh token
  # 3. Use refresh token to get new access token
  # 4. Old refresh token should be invalidated
  ```

- [ ] **HIGH**: No JWT stored in localStorage
  ```bash
  # Check apps/web/src/lib/auth.ts
  # Token storage should be httpOnly cookies (if possible)
  # Or in-memory for SPA
  # ❌ NEVER: localStorage.setItem('token', jwt)
  ```

### 3.2 Password Security

- [ ] **CRITICAL**: Passwords hashed (bcrypt minimum 12 rounds)
  ```typescript
  // services/api/src/modules/auth/auth.service.ts
  // Expected:
  const hash = await bcrypt.hash(password, 12);
  // NOT: plaintext or weak hash
  ```

- [ ] **CRITICAL**: Password validation rules enforced
  ```bash
  # Test with weak password:
  curl -X POST https://api.imobi.com.br/api/v1/auth/signup \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@test.com","senha":"abc"}'
  # Expected: HTTP 400, validation error
  
  # Test with strong password:
  # Expected: HTTP 201, user created
  ```

- [ ] **MEDIUM**: Password reset tokens have TTL
  ```typescript
  // services/api/src/modules/auth/password-reset.service.ts
  // Expected: Token expires in 1 hour
  // NOT: Tokens valid forever
  ```

### 3.3 Authorization

- [ ] **CRITICAL**: All endpoints require authentication
  ```bash
  # Test protected endpoint without token:
  curl https://api.imobi.com.br/api/v1/obras
  # Expected: HTTP 401 Unauthorized
  
  # With valid token:
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.imobi.com.br/api/v1/obras
  # Expected: HTTP 200 OK
  ```

- [ ] **HIGH**: Authorization checks on all operations
  ```bash
  # Test: User cannot access another user's data
  # 1. Login as user A
  # 2. Try to access user B's obra with A's token
  # Expected: HTTP 403 Forbidden
  ```

- [ ] **MEDIUM**: Role-based access control (RBAC) enforced
  ```bash
  # Test: Engineer cannot approve (manager-only action)
  curl -X POST https://api.imobi.com.br/api/v1/etapas/123/aprovar \
    -H "Authorization: Bearer $ENGINEER_TOKEN"
  # Expected: HTTP 403 Forbidden
  ```

---

## 4. Input Validation & Output Encoding

### 4.1 Input Validation

- [ ] **CRITICAL**: All inputs validated against Zod schemas
  ```typescript
  // services/api/src/modules/auth/auth.controller.ts
  // Expected:
  const data = createUserSchema.parse(req.body);
  // Validates: email format, password strength, CPF format, etc.
  ```

- [ ] **CRITICAL**: No SQL injection vulnerabilities
  ```bash
  # Test with SQL injection payload:
  curl -X POST https://api.imobi.com.br/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{
      "email":"admin@test.com\"; DROP TABLE users; --",
      "senha":"x"
    }'
  # Expected: HTTP 400 validation error
  # NOT: Database table dropped
  ```

- [ ] **HIGH**: File upload validation
  ```bash
  # Test: Upload non-image file with .jpg extension
  # Expected: HTTP 400, file type validation error
  # NOT: File uploaded as-is
  ```

- [ ] **HIGH**: No path traversal vulnerabilities
  ```bash
  # Test: Request ../../../etc/passwd
  curl https://api.imobi.com.br/files/../../etc/passwd
  # Expected: HTTP 404 or 403
  # NOT: System files exposed
  ```

### 4.2 Output Encoding

- [ ] **HIGH**: User input is escaped in HTML responses
  ```bash
  # Test: Register user with name: <script>alert('xss')</script>
  # Expected: <script> tags are escaped or sanitized
  # View source: Should show &lt;script&gt; or omitted
  ```

- [ ] **MEDIUM**: JSON responses don't include sensitive data
  ```bash
  curl -s https://api.imobi.com.br/api/v1/users/123 | jq .
  # Expected: No passwords, private keys, or tokens in response
  ```

---

## 5. Sensitive Data Protection

### 5.1 Data in Transit

- [ ] **CRITICAL**: All data encrypted in transit (HTTPS)
  ```bash
  # Verify with curl verbose:
  curl -v https://api.imobi.com.br/api/v1/health 2>&1 | \
    grep "TLSv1"
  # Expected: TLSv1.2 or TLSv1.3
  ```

- [ ] **HIGH**: No sensitive data in URLs
  ```bash
  # ❌ BAD: GET /api/users/auth?email=user@test.com&password=secret
  # ✅ GOOD: POST /api/auth/login with body
  ```

- [ ] **MEDIUM**: No sensitive data in HTTP headers
  ```bash
  # ❌ BAD: Authorization: Bearer token in query string
  # ✅ GOOD: Authorization: Bearer token in header
  ```

### 5.2 Data at Rest

- [ ] **CRITICAL**: Sensitive data encrypted in database
  ```typescript
  // services/api/src/modules/users/user.service.ts
  // Expected: CPF, phone, financial data encrypted with ENCRYPTION_KEY
  ```

- [ ] **CRITICAL**: No plaintext passwords in database
  ```bash
  psql $DATABASE_URL -c "SELECT password FROM usuarios LIMIT 1;"
  # Expected: bcrypt hash ($2b$12$...)
  # NOT: plaintext
  ```

- [ ] **HIGH**: Environment variables not logged
  ```bash
  # Check logs:
  railway logs --service imobi-api-prod | grep "JWT_SECRET"
  # Expected: (empty - no secrets in logs)
  ```

- [ ] **MEDIUM**: Database backups encrypted
  ```bash
  # Check backup:
  file imobi_backup_20260623.sql.gz
  # Expected: gzip compressed (or encrypted)
  ```

### 5.3 Logging

- [ ] **CRITICAL**: No passwords in logs
  ```bash
  # Grep all log files:
  grep -r "password" logs/ | grep -v "Password must"
  # Expected: (empty or only policy messages)
  ```

- [ ] **CRITICAL**: No tokens in logs
  ```bash
  grep -r "Bearer\|JWT\|Token=" logs/
  # Expected: (empty)
  ```

- [ ] **HIGH**: Structured logging (not raw stack traces)
  ```bash
  # Check log format:
  tail -f logs/app.log | head -1
  # Expected: JSON format with timestamp, level, message, context
  # NOT: Raw error stack traces with sensitive data
  ```

---

## 6. API Security

### 6.1 Rate Limiting

- [ ] **CRITICAL**: Rate limiting enabled
  ```bash
  # Verify configuration:
  grep "RATE_LIMIT_ENABLED" .env.production
  # Expected: RATE_LIMIT_ENABLED=true
  ```

- [ ] **CRITICAL**: Rate limiting actually works
  ```bash
  # Send 101+ requests to same endpoint in 60 seconds:
  for i in {1..105}; do
    curl -s -o /dev/null -w "%{http_code}\n" \
      https://api.imobi.com.br/api/v1/health
  done
  # Expected: Last requests return 429 (Too Many Requests)
  ```

- [ ] **HIGH**: Rate limiting per IP address
  ```bash
  # Attack from same IP should be rate limited
  # Attack from different IP should be allowed (for load testing)
  ```

- [ ] **MEDIUM**: Different limits for different endpoints
  ```bash
  # /api/v1/auth/login: Stricter (5 req/min)
  # /api/v1/health: Relaxed (1000 req/min)
  # Admin endpoints: Stricter (10 req/min)
  ```

### 6.2 API Versioning

- [ ] **HIGH**: API endpoints versioned (/api/v1/*)
  ```bash
  # Check endpoints:
  curl https://api.imobi.com.br/docs | grep "/api/v"
  # Expected: /api/v1/ prefix on all endpoints
  ```

- [ ] **MEDIUM**: Old versions are deprecated (v0)
  ```bash
  curl https://api.imobi.com.br/api/v0/health
  # Expected: 410 Gone or 404 Not Found
  # NOT: 200 OK with old behavior
  ```

---

## 7. Database Security

### 7.1 Access Control

- [ ] **CRITICAL**: Database requires password authentication
  ```bash
  # Try to connect without password:
  psql -h $POSTGRES_HOST -U imobi_user -d imobi_prod
  # Expected: "password authentication failed"
  # NOT: Connected without password
  ```

- [ ] **CRITICAL**: Database user has minimal permissions
  ```bash
  psql -U postgres -c "
  SELECT usename, usesuper, usecreatedb FROM pg_user 
  WHERE usename = 'imobi_user';
  "
  # Expected: usesuper=false, usecreatedb=false
  # NOT: Superuser or admin privileges
  ```

- [ ] **HIGH**: Production database not accessible from internet
  ```bash
  # From local machine:
  timeout 5 psql -h $POSTGRES_HOST -d imobi_prod
  # Expected: Connection timeout or refused
  # (Should only be accessible from API server)
  ```

### 7.2 Backups

- [ ] **CRITICAL**: Database backups are encrypted
  ```bash
  file imobi_backup_*.sql.gz
  # Expected: gzip compressed data
  ```

- [ ] **HIGH**: Backups stored securely (not in web root)
  ```bash
  # Check backup location:
  ls -la /backups/
  # Expected: (exists with restricted permissions)
  # OR: Stored in S3 with encryption
  ```

- [ ] **HIGH**: Backups tested for restoration
  ```bash
  # Monthly: Test restore to staging database
  # Expected: Restore completes in < 30 minutes
  ```

### 7.3 Data Encryption

- [ ] **HIGH**: Database supports encryption at rest
  ```bash
  # Check in Railway/Render:
  # Database Settings → Encryption
  # Expected: Encryption at rest enabled
  ```

- [ ] **MEDIUM**: Connection string uses SSL
  ```bash
  grep "DATABASE_URL" .env.production | grep "sslmode"
  # Expected: sslmode=require or sslmode=verify-full
  ```

---

## 8. Secrets Management

### 8.1 Secret Storage

- [ ] **CRITICAL**: No secrets in git history
  ```bash
  # Scan git history:
  git log -S "JWT_SECRET" --all --oneline | wc -l
  # Expected: 0 results
  
  # Scan for AWS keys:
  git log -S "AKIA" --all --oneline | wc -l
  # Expected: 0 results
  ```

- [ ] **CRITICAL**: .env files in .gitignore
  ```bash
  cat .gitignore | grep -E "\.env|\.local"
  # Expected: Multiple matches including .env.production
  ```

- [ ] **CRITICAL**: Secrets in deployment platform only
  ```bash
  # Verify:
  # Vercel: Settings → Environment Variables (Production scope)
  # Railway: Service → Variables
  # ✅ Not in code or config files
  ```

### 8.2 Secret Rotation

- [ ] **HIGH**: Plan for secret rotation
  ```markdown
  ## Rotation Schedule:
  - JWT_SECRET: Quarterly (every 90 days)
  - ENCRYPTION_KEY: Annually
  - Database passwords: Annually
  - AWS access keys: Monthly
  - API keys (SendGrid, Firebase): Semi-annually
  ```

- [ ] **MEDIUM**: Procedure documented for rotating secrets
  ```bash
  # Document includes:
  # 1. Generate new secret
  # 2. Add new secret to deployment platform
  # 3. Deploy code that supports both old and new
  # 4. After deployment, remove old secret
  # 5. Verify logs for any authentication failures
  ```

---

## 9. Content Security Policy (CSP)

### 9.1 CSP Headers

- [ ] **HIGH**: CSP header configured
  ```bash
  curl -I https://imobi.com.br | grep "Content-Security-Policy"
  # Expected: Header present with restrictive policy
  ```

- [ ] **HIGH**: CSP doesn't use 'unsafe-inline' (if possible)
  ```bash
  curl -I https://imobi.com.br | grep "Content-Security-Policy"
  # Expected: script-src 'self' (not 'unsafe-inline')
  # OK: If needed for bundler, minimize scope
  ```

- [ ] **MEDIUM**: CSP allows only trusted sources
  ```bash
  # CSP should include:
  # - script-src 'self' *.sentry.io
  # - img-src 'self' *.amazonaws.com
  # - connect-src 'self' https://api.imobi.com.br
  # ❌ NOT: script-src * or img-src data: (overly permissive)
  ```

---

## 10. Security Headers

### 10.1 Required Headers

- [ ] **HIGH**: X-Content-Type-Options header set
  ```bash
  curl -I https://api.imobi.com.br/api/v1/health | \
    grep "X-Content-Type-Options"
  # Expected: X-Content-Type-Options: nosniff
  ```

- [ ] **HIGH**: X-Frame-Options header set
  ```bash
  curl -I https://imobi.com.br | grep "X-Frame-Options"
  # Expected: X-Frame-Options: DENY or SAMEORIGIN
  ```

- [ ] **HIGH**: X-XSS-Protection header set
  ```bash
  curl -I https://imobi.com.br | grep "X-XSS-Protection"
  # Expected: X-XSS-Protection: 1; mode=block
  ```

- [ ] **MEDIUM**: Referrer-Policy header set
  ```bash
  curl -I https://api.imobi.com.br | grep "Referrer-Policy"
  # Expected: Referrer-Policy: strict-origin-when-cross-origin
  ```

---

## 11. API Documentation Security

### 11.1 Swagger/OpenAPI

- [ ] **MEDIUM**: Swagger UI disabled in production
  ```bash
  curl -I https://api.imobi.com.br/docs
  # Expected: 404 Not Found (swagger disabled)
  # OR: 401 Unauthorized (requires auth)
  
  # Check config:
  grep "SWAGGER_ENABLED" .env.production
  # Expected: SWAGGER_ENABLED=false
  ```

- [ ] **LOW**: If Swagger enabled, it requires authentication
  ```bash
  # If needed in production:
  curl https://api.imobi.com.br/docs
  # Expected: 401 Unauthorized
  ```

---

## 12. Dependency Security

### 12.1 Vulnerability Scanning

- [ ] **HIGH**: No known high-severity vulnerabilities
  ```bash
  pnpm audit
  # Expected: 0 high vulnerabilities
  # Medium/low: Document and plan fixes
  ```

- [ ] **HIGH**: All dependencies up-to-date
  ```bash
  pnpm outdated
  # Expected: Minimal outdated packages
  # Upgrade: pnpm update --latest
  ```

- [ ] **MEDIUM**: Dependency scanning in CI/CD
  ```bash
  # .github/workflows/ci-cd.yml should include:
  # - pnpm audit
  # - npm check security advisories
  # Workflow fails if high vulnerabilities found
  ```

### 12.2 Lock Files

- [ ] **HIGH**: pnpm-lock.yaml is committed
  ```bash
  git ls-files | grep "pnpm-lock.yaml"
  # Expected: pnpm-lock.yaml committed
  ```

- [ ] **MEDIUM**: Lock files prevent dependency confusion
  ```bash
  # pnpm-lock.yaml pins exact versions
  # Prevents npm install from pulling compromised packages
  ```

---

## 13. Monitoring & Alerting

### 13.1 Error Tracking

- [ ] **HIGH**: Sentry configured and receiving errors
  ```bash
  # Trigger test error:
  curl -X POST https://api.imobi.com.br/test-error
  
  # Check Sentry dashboard:
  # https://sentry.io/organizations/imobi/issues/
  # Expected: Error appears within 10 seconds
  ```

- [ ] **HIGH**: Sentry alerts configured
  ```bash
  # Sentry: Settings → Alerts
  # Expected:
  # - Alert when error occurs
  # - Notification to Slack
  # - Digest every 10 minutes (not spam)
  ```

- [ ] **MEDIUM**: No sensitive data in Sentry
  ```bash
  # Sentry: Data Settings → PII
  # Expected: Strip all PII (emails, phone, IP addresses)
  ```

### 13.2 Security Monitoring

- [ ] **MEDIUM**: Authentication failures logged
  ```bash
  # Check logs:
  railway logs --service imobi-api-prod | grep "authentication"
  # Expected: Failed auth attempts logged with IP
  ```

- [ ] **MEDIUM**: Rate limit violations logged
  ```bash
  # Check logs:
  # Expected: When 429 returned, log source IP and endpoint
  ```

- [ ] **LOW**: Regular log review scheduled
  ```markdown
  ## Weekly log review:
  - Authentication failures
  - Rate limit violations
  - Database errors
  - Suspicious patterns
  ```

---

## 14. Infrastructure Security

### 14.1 Network Security

- [ ] **CRITICAL**: Database not exposed to public internet
  ```bash
  # From random IP:
  timeout 5 psql -h $DATABASE_HOST
  # Expected: Connection timeout
  ```

- [ ] **CRITICAL**: Redis not exposed to public internet
  ```bash
  # From random IP:
  timeout 5 redis-cli -h $REDIS_HOST PING
  # Expected: Connection timeout or error
  ```

- [ ] **HIGH**: API runs behind WAF/DDoS protection
  ```bash
  # Vercel provides built-in WAF
  # Railway/Render: Consider Cloudflare DDoS protection
  ```

### 14.2 Container Security

- [ ] **HIGH**: Docker image minimal base
  ```bash
  head -1 services/api/Dockerfile
  # Expected: FROM node:20-alpine (minimal, not ubuntu)
  ```

- [ ] **MEDIUM**: No secrets in Docker image
  ```bash
  # secrets/private keys should NOT be in Dockerfile
  # Injected via environment variables at runtime
  ```

---

## 15. Incident Response

### 15.1 Breach Response

- [ ] **HIGH**: Incident response plan documented
  ```bash
  # Check: docs/INCIDENT_RESPONSE_INDEX.md
  # Should include:
  # 1. Identification procedures
  # 2. Containment steps
  # 3. Communication templates
  # 4. Forensic preservation
  # 5. Post-incident review
  ```

- [ ] **MEDIUM**: Contact information documented
  ```markdown
  ## Incident Contact List:
  - Security Lead: [Name/Phone]
  - CEO: [Name/Phone]
  - Legal: [Name/Phone]
  - Customer Support: [Name/Email]
  ```

- [ ] **LOW**: Regular security drills scheduled
  ```markdown
  ## Quarterly security drills:
  - Simulate data breach
  - Test incident response
  - Update procedures
  - Document lessons learned
  ```

---

## 16. Compliance & Legal

### 16.1 Data Privacy

- [ ] **HIGH**: Privacy policy updated
  ```bash
  # Verify: https://imobi.com.br/privacy
  # Should describe:
  # - Data collection
  # - Data usage
  # - Retention periods
  # - User rights (GDPR/LGPD)
  ```

- [ ] **HIGH**: Terms of Service updated
  ```bash
  # Verify: https://imobi.com.br/terms
  # Should include:
  # - Liability limitations
  # - Security commitments
  # - Cookie policy
  ```

- [ ] **MEDIUM**: LGPD (Brazil) compliance
  ```markdown
  ## LGPD Compliance:
  - [ ] User consent for data collection
  - [ ] Right to be forgotten
  - [ ] Data portability
  - [ ] Privacy impact assessments
  - [ ] DPA agreements with vendors
  ```

---

## 17. Penetration Testing

### 17.1 Pre-Launch Testing

- [ ] **MEDIUM**: Manual security testing completed
  ```markdown
  ## Testing checklist:
  - [ ] SQL injection tests on all inputs
  - [ ] XSS tests on all outputs
  - [ ] CSRF token validation
  - [ ] Insecure direct object references (IDOR)
  - [ ] Broken authentication flows
  - [ ] Sensitive data exposure
  - [ ] Rate limiting bypass attempts
  - [ ] Authentication bypass attempts
  ```

- [ ] **LOW**: Professional penetration test scheduled (post-launch)
  ```markdown
  ## Penetration Testing Plan:
  - Scope: All frontend and API endpoints
  - Schedule: Week after launch
  - Budget: $5,000-10,000
  - Remediation: 30 days for critical, 90 days for others
  ```

---

## 18. Final Security Audit

### Sign-Off

- [ ] **CRITICAL**: All CRITICAL items completed
- [ ] **CRITICAL**: All HIGH items completed or documented with risk acceptance
- [ ] **HIGH**: Security team has reviewed all code changes
- [ ] **HIGH**: Third-party dependencies reviewed for security
- [ ] **MEDIUM**: All security headers properly configured
- [ ] **MEDIUM**: Secrets properly managed and rotated
- [ ] **MEDIUM**: Monitoring and alerting configured

### Sign-Off Signatures

**Security Lead**:  
Name: _____________________  
Date: _____________________  
Signature: ________________  

**DevOps Lead**:  
Name: _____________________  
Date: _____________________  
Signature: ________________  

**CTO/Tech Lead**:  
Name: _____________________  
Date: _____________________  
Signature: ________________  

---

## Appendix: Security Resources

### OWASP Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Best Practices
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Benchmarks](https://www.cisecurity.org/benchmark/)

### Tools
- [OWASP ZAP](https://www.zaproxy.org/) - Free penetration testing
- [npm audit](https://docs.npmjs.com/cli/audit) - Dependency scanning
- [Snyk](https://snyk.io/) - Continuous vulnerability scanning
- [SonarQube](https://www.sonarqube.org/) - Code quality and security

---

**Document Version**: 1.0  
**Last Updated**: June 23, 2026  
**Next Review**: Quarterly (every 3 months)
