import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../modules/prisma/prisma.service';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'SecurePass123!@#',
        nome: 'Test User',
        cpf: '11144477735', // Valid test CPF
        celular: '11999999999',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.user.email).toBe(signupData.email);
    });

    it('should reject invalid CPF', async () => {
      const signupData = {
        email: 'invalid@example.com',
        password: 'SecurePass123!@#',
        nome: 'Invalid User',
        cpf: '12345678901', // Invalid CPF
        celular: '11999999999',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(400);
    });

    it('should reject weak password', async () => {
      const signupData = {
        email: 'weak@example.com',
        password: 'weak',
        nome: 'Weak Password User',
        cpf: '11144477735',
        celular: '11999999999',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(400);
    });

    it('should reject duplicate email', async () => {
      const signupData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!@#',
        nome: 'Duplicate User',
        cpf: '11144477736',
        celular: '11999999999',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(201);

      // Attempt duplicate
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: { email: string; password: string; cpf: string };

    beforeAll(async () => {
      testUser = {
        email: 'logintest@example.com',
        password: 'SecurePass123!@#',
        cpf: '11144477737',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          nome: 'Login Test User',
          celular: '11999999999',
        });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass123!@#',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const signupData = {
        email: 'refresh@example.com',
        password: 'SecurePass123!@#',
        nome: 'Refresh Test User',
        cpf: '11144477738',
        celular: '11999999999',
      };

      const signup = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(signupData)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${signup.body.refresh_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
    });
  });
});
