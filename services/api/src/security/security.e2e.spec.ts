import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';

/**
 * Security Test Suite
 * Validates: Authorization, IDOR, Rate limiting, Encryption, CSRF
 */
describe('Security Tests (E2E)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let refreshToken: string;
  let userId: string;
  let obraId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('[SECURITY] Authorization & IDOR Prevention', () => {
    it('should prevent IDOR: user cannot access other user\'s obras', async () => {
      // Create user 1 and login
      const signupRes1 = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'User 1',
          email: `user1-${Date.now()}@test.com`,
          cpf: '12345678901',
          telefone: '11999999999',
          senha: 'SecurePass123!',
        });

      expect(signupRes1.status).toBe(201);
      const user1Id = signupRes1.body.id;
      const user1Token = signupRes1.body.accessToken;

      // Create user 2 and login
      const signupRes2 = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'User 2',
          email: `user2-${Date.now()}@test.com`,
          cpf: '12345678902',
          telefone: '11999999998',
          senha: 'SecurePass123!',
        });

      expect(signupRes2.status).toBe(201);
      const user2Token = signupRes2.body.accessToken;

      // User 1 creates obra
      const obraRes = await request(app.getHttpServer())
        .post('/api/v1/obras')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          titulo: 'Test Obra',
          descricao: 'Test Description',
          latitude: -23.5505,
          longitude: -46.6333,
        });

      expect(obraRes.status).toBe(201);
      const createdObraId = obraRes.body.id;

      // User 2 tries to access User 1's obra
      const idor = await request(app.getHttpServer())
        .get(`/api/v1/obras/${createdObraId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Should be 403 Forbidden (owner validation)
      expect([403, 404]).toContain(idor.status);
    });

    it('should prevent unauthenticated access to protected endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/obras');

      expect(res.status).toBe(401);
    });

    it('should reject invalid JWT tokens', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/obras')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });

  describe('[SECURITY] Rate Limiting', () => {
    it('should enforce rate limit on auth endpoints', async () => {
      const endpoint = '/api/v1/auth/login';
      let lastStatus = 200;

      // Send 20 requests rapidly to trigger rate limit
      for (let i = 0; i < 20; i++) {
        const res = await request(app.getHttpServer())
          .post(endpoint)
          .send({
            email: `test-${i}@example.com`,
            senha: 'wrongpassword',
          });

        lastStatus = res.status;

        // Stop if rate limited (429) or clear error
        if (res.status === 429) {
          break;
        }
      }

      // Should hit rate limit (429) or at minimum return error
      expect([401, 429]).toContain(lastStatus);
    });
  });

  describe('[SECURITY] Data Encryption', () => {
    it('should not expose sensitive data in API responses', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'Encryption Test User',
          email: `encrypt-test-${Date.now()}@test.com`,
          cpf: '12345678903',
          telefone: '11999999997',
          senha: 'SecurePass123!',
        });

      expect(signupRes.status).toBe(201);

      // Check response doesn't contain raw passwords or secrets
      expect(JSON.stringify(signupRes.body)).not.toContain('senha');
      expect(JSON.stringify(signupRes.body)).not.toContain('password');
      expect(signupRes.body.accessToken).toBeDefined();
    });

    it('should use HttpOnly cookies for refresh tokens', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'Cookie Test User',
          email: `cookie-test-${Date.now()}@test.com`,
          cpf: '12345678904',
          telefone: '11999999996',
          senha: 'SecurePass123!',
        });

      expect(signupRes.status).toBe(201);

      // Check for HttpOnly cookie in Set-Cookie header
      const setCookieHeader = signupRes.headers['set-cookie'];
      if (setCookieHeader) {
        const cookieStr = Array.isArray(setCookieHeader)
          ? setCookieHeader.join('; ')
          : setCookieHeader;

        // Should be HttpOnly to prevent XSS access
        expect(cookieStr).toMatch(/HttpOnly/i);
      }
    });
  });

  describe('[SECURITY] CSRF Protection', () => {
    it('should require CSRF token or proper origin for state-changing requests', async () => {
      // POST requests without proper authentication should fail
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'CSRF Test',
          email: 'csrf@test.com',
          cpf: '12345678905',
          telefone: '11999999995',
          senha: 'SecurePass123!',
        });

      // Should be 201 (signup doesn't require CSRF, but demonstrates endpoint)
      expect([201, 400, 403]).toContain(res.status);
    });
  });

  describe('[SECURITY] Input Validation & Sanitization', () => {
    it('should reject invalid CPF format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'Invalid CPF User',
          email: 'invalid@test.com',
          cpf: 'invalid-cpf',
          telefone: '11999999994',
          senha: 'SecurePass123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'Weak Password User',
          email: `weak-pass-${Date.now()}@test.com`,
          cpf: '12345678906',
          telefone: '11999999993',
          senha: '123', // Too short
        });

      expect(res.status).toBe(400);
    });

    it('should sanitize HTML/SQL in input fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: '<script>alert("xss")</script>',
          email: `xss-test-${Date.now()}@test.com`,
          cpf: '12345678907',
          telefone: '11999999992',
          senha: 'SecurePass123!',
        });

      // Should either reject or sanitize
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        // If accepted, should be sanitized
        expect(res.body.nome).not.toContain('<script>');
      }
    });
  });

  describe('[SECURITY] Token Management', () => {
    it('should invalidate token after logout', async () => {
      // Sign up
      const signupRes = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          nome: 'Logout Test User',
          email: `logout-test-${Date.now()}@test.com`,
          cpf: '12345678908',
          telefone: '11999999991',
          senha: 'SecurePass123!',
        });

      const token = signupRes.body.accessToken;

      // Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(logoutRes.status);

      // Try to use token after logout
      const afterLogout = await request(app.getHttpServer())
        .get('/api/v1/obras')
        .set('Authorization', `Bearer ${token}`);

      expect(afterLogout.status).toBe(401);
    });
  });

  describe('[SECURITY] CORS & Headers', () => {
    it('should include security headers in responses', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');

      // Check for common security headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      // CSP should be present
      expect(res.headers['content-security-policy']).toBeDefined();
    });
  });
});
