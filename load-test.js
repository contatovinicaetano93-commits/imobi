import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Stay at 100 VUs
    { duration: '2m', target: 200 },  // Ramp to 200 VUs
    { duration: '5m', target: 200 },  // Stay at 200 VUs
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
let authToken = '';

export default function () {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    check(response, {
      'health status is 200': (r) => r.status === 200,
      'has uptime': (r) => r.json('uptime') !== undefined,
    });
  });

  sleep(1);

  group('Authentication', () => {
    const registerPayload = JSON.stringify({
      nome: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      cpf: '12345678901',
      telefone: '11999999999',
      senha: 'Test@1234',
      tipo: 'TOMADOR',
    });

    const registerResponse = http.post(`${BASE_URL}/auth/registrar`, registerPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(registerResponse, {
      'register status is 201': (r) => r.status === 201,
      'has access token': (r) => r.json('accessToken') !== undefined,
    });

    if (registerResponse.status === 201) {
      authToken = registerResponse.json('accessToken');
    }
  });

  sleep(1);

  if (authToken) {
    group('KYC Status', () => {
      const response = http.get(`${BASE_URL}/kyc/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      check(response, {
        'kyc status is 200': (r) => r.status === 200,
        'has status field': (r) => r.json('status') !== undefined,
      });
    });

    sleep(1);

    group('Works List', () => {
      const response = http.get(`${BASE_URL}/obras?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      check(response, {
        'works status is 200': (r) => r.status === 200,
        'returns array': (r) => Array.isArray(r.json('data') || r.json()),
      });
    });

    sleep(1);

    group('Credit Simulator', () => {
      const response = http.get(`${BASE_URL}/credito/simular?valor=100000&prazo=60`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      check(response, {
        'simulator status is 200': (r) => r.status === 200,
        'has jurosTotal': (r) => r.json('jurosTotal') !== undefined,
      });
    });
  }

  sleep(2);
}
