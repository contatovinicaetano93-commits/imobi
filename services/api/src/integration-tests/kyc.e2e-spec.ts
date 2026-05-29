import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('KYC Integration Tests', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Register and login test user
    const signup = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'kyctest@example.com',
        password: 'SecurePass123!@#',
        nome: 'KYC Test User',
        cpf: '11144477739',
        celular: '11999999999',
      });

    accessToken = signup.body.access_token;
    userId = signup.body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/kyc/status', () => {
    it('should return KYC status for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/kyc/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('documents');
      expect(['NENHUM', 'ENVIADO', 'APROVADO', 'REJEITADO']).toContain(
        response.body.status,
      );
    });

    it('should reject unauthorized request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/kyc/status')
        .expect(401);
    });
  });

  describe('POST /api/v1/kyc/upload', () => {
    it('should upload KYC documents', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: 'RG',
          documentFront: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          documentBack:
            'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.documentType).toBe('RG');
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: 'RG',
        })
        .expect(400);
    });

    it('should reject invalid document type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: 'INVALID',
          documentFront: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          documentBack:
            'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/kyc/:id', () => {
    let documentId: string;

    beforeAll(async () => {
      const upload = await request(app.getHttpServer())
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: 'PASSPORT',
          documentFront: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          documentBack:
            'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        });

      documentId = upload.body.id;
    });

    it('should approve KYC document as manager', async () => {
      // First, login as manager/admin
      const managerSignup = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'manager@example.com',
          password: 'SecurePass123!@#',
          nome: 'Manager User',
          cpf: '11144477740',
          celular: '11999999999',
          role: 'GESTOR_OBRA',
        });

      const managerToken = managerSignup.body.access_token;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/kyc/${documentId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'APROVADO' })
        .expect(200);

      expect(response.body.status).toBe('APROVADO');
    });

    it('should reject KYC document', async () => {
      const upload = await request(app.getHttpServer())
        .post('/api/v1/kyc/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          documentType: 'CNH',
          documentFront: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          documentBack:
            'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        });

      const newDocId = upload.body.id;

      const managerLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'manager@example.com',
          password: 'SecurePass123!@#',
        });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/kyc/${newDocId}`)
        .set('Authorization', `Bearer ${managerLogin.body.access_token}`)
        .send({
          status: 'REJEITADO',
          rejectionReason: 'Documento ilegível',
        })
        .expect(200);

      expect(response.body.status).toBe('REJEITADO');
      expect(response.body.rejectionReason).toBe('Documento ilegível');
    });
  });
});
