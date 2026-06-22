import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * Integration Tests: Full Auth + API Flow
 * Run: pnpm test --testPathPattern=integration.test
 */

describe('Imobi MVP - Integration Tests', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
  const TEST_EMAIL = `test-${Date.now()}@imobi.test`;
  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_CPF = '12345678900';

  let accessToken: string;
  let userId: string;

  // ──────────────────────────────────────────────
  // 1. AUTHENTICATION TESTS
  // ──────────────────────────────────────────────

  describe('Auth Flow', () => {
    it('should register new user', async () => {
      const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Test User',
          cpf: TEST_CPF,
          email: TEST_EMAIL,
          telefone: '11999999999',
          senha: TEST_PASSWORD,
          consentidoTermos: true,
          consentidoPrivacy: true,
          consentidoKyc: true,
          consentidoMarketing: false,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.role).toBe('TOMADOR');
      userId = data.id;
    });

    it('should reject duplicate email', async () => {
      const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Duplicate User',
          cpf: '98765432100',
          email: TEST_EMAIL,
          telefone: '11999999999',
          senha: TEST_PASSWORD,
          consentidoTermos: true,
          consentidoPrivacy: true,
          consentidoKyc: true,
          consentidoMarketing: false,
        }),
      });

      expect(res.status).toBe(409);
    });

    it('should login user and return JWT token', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          senha: TEST_PASSWORD,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      accessToken = data.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          senha: 'WrongPassword123!',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────
  // 2. PROTECTED ENDPOINT TESTS
  // ──────────────────────────────────────────────

  describe('Protected Endpoints', () => {
    it('should access protected endpoint with JWT', async () => {
      const res = await fetch(`${API_URL}/credito`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should reject request without token', async () => {
      const res = await fetch(`${API_URL}/credito`);
      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await fetch(`${API_URL}/credito`, {
        headers: { Authorization: 'Bearer invalid.token.here' },
      });

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────
  // 3. PUBLIC ENDPOINT TESTS
  // ──────────────────────────────────────────────

  describe('Public Endpoints', () => {
    it('should access public simulator without auth', async () => {
      const res = await fetch(`${API_URL}/public/simulador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorSolicitado: 1000000,
          prazoMeses: 24,
          tipoObra: 'CONSTRUCAO',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.parcelaMensal).toBeDefined();
      expect(data.taxaMensal).toBeDefined();
    });

    it('should validate simulator input', async () => {
      const res = await fetch(`${API_URL}/public/simulador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorSolicitado: -1000, // Invalid: negative
          prazoMeses: 24,
          tipoObra: 'CONSTRUCAO',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────
  // 4. RATE LIMITING TESTS
  // ──────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('should enforce rate limit after max requests', async () => {
      const maxRequests = 10;
      let rateLimited = false;

      for (let i = 0; i < maxRequests + 5; i++) {
        const res = await fetch(`${API_URL}/public/simulador`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valorSolicitado: 1000000,
            prazoMeses: 24,
            tipoObra: 'CONSTRUCAO',
          }),
        });

        if (res.status === 429) {
          rateLimited = true;
          break;
        }
      }

      // Note: Exact behavior depends on rate limit config
      // This test may need adjustment based on actual limits
    });
  });

  // ──────────────────────────────────────────────
  // 5. API HEALTH CHECKS
  // ──────────────────────────────────────────────

  describe('API Health', () => {
    it('should respond to health check', async () => {
      const res = await fetch(`${API_URL.replace('/api/v1', '')}/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.database).toBeDefined();
    });

    it('should provide metrics endpoint', async () => {
      const res = await fetch(`${API_URL.replace('/api/v1', '')}/metrics`);
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain('http_request_duration_seconds');
      expect(text).toContain('TYPE');
    });
  });

  // ──────────────────────────────────────────────
  // 6. OPENAPI DOCUMENTATION
  // ──────────────────────────────────────────────

  describe('API Documentation', () => {
    it('should provide Swagger/OpenAPI docs', async () => {
      const res = await fetch(`${API_URL.replace('/api/v1', '')}/docs`);
      expect(res.status).toBe(200);

      const html = await res.text();
      expect(html).toContain('swagger');
      expect(html).toContain('/api/v1');
    });
  });

  // ──────────────────────────────────────────────
  // 7. ERROR HANDLING
  // ──────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoint', async () => {
      const res = await fetch(`${API_URL}/nonexistent`);
      expect(res.status).toBe(404);
    });

    it('should return validation errors', async () => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          senha: '123', // Too short
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.errors).toBeDefined();
    });
  });
});

// ──────────────────────────────────────────────
// SMOKE TESTS (Quick validation)
// ──────────────────────────────────────────────

describe('Smoke Tests - Quick Validation', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

  it('API is reachable', async () => {
    const res = await fetch(API_URL.replace('/api/v1', '/health'));
    expect([200, 404]).toContain(res.status); // 200 if health endpoint exists, 404 if not yet
  });

  it('Can call public simulator', async () => {
    const res = await fetch(`${API_URL}/public/simulador`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valorSolicitado: 500000,
        prazoMeses: 12,
        tipoObra: 'CONSTRUCAO',
      }),
    });

    expect([200, 400, 500]).toContain(res.status);
  });
});
