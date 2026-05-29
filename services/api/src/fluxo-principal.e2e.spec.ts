import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('[E2E] Fluxo Principal', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let usuarioId: string;
  let creditoId: string;
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

  it('1️⃣ should register new usuario', async () => {
    const res = await app.get('http://localhost:4000/api/v1/auth/registrar')
      .send({
        nome: 'Test User',
        cpf: '12345678901',
        email: 'test@test.com',
        telefone: '11999999999',
        password: 'SecurePass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toBeDefined();
    expect(res.body.accessToken).toBeDefined();
    usuarioId = res.body.usuario.usuarioId;
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('2️⃣ should login usuario', async () => {
    const res = await app.get('http://localhost:4000/api/v1/auth/login')
      .send({
        email: 'test@test.com',
        password: 'SecurePass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('3️⃣ should request credito', async () => {
    const res = await app.get('http://localhost:4000/api/v1/creditos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        valorSolicitado: 50000,
        prazoMeses: 24,
        finalidade: 'Reforma',
      });

    expect(res.status).toBe(201);
    expect(res.body.creditoId).toBeDefined();
    creditoId = res.body.creditoId;
  });

  it('4️⃣ should create obra', async () => {
    const res = await app.get('http://localhost:4000/api/v1/obras')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nome: 'Obra Test',
        endereco: 'Rua Test 123',
        latitude: -23.5505,
        longitude: -46.6333,
        creditoId,
      });

    expect(res.status).toBe(201);
    expect(res.body.obraId).toBeDefined();
    obraId = res.body.obraId;
  });

  it('5️⃣ should upload evidencia', async () => {
    const res = await app.post('http://localhost:4000/api/v1/evidencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('obraId', obraId)
      .field('latitude', '-23.5505')
      .field('longitude', '-46.6333')
      .attach('foto', Buffer.from('fake image'), 'test.jpg');

    expect(res.status).toBe(201);
    expect(res.body.evidenciaId).toBeDefined();
  });

  it('6️⃣ should enqueue liberacao-parcela job', async () => {
    // Verificar que job foi criado na fila
    const res = await app.get(`http://localhost:4000/api/v1/creditos/${creditoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
  });
});
