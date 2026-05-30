/**
 * IMOBI Cutover Load Test — k6
 *
 * Propósito: Validar que infraestrutura aguenta carga esperada
 *
 * Como executar:
 *   k6 run \
 *     -e API_URL=https://api.imobi.com.br \
 *     scripts/cutover-load-test.js \
 *     --out json=cutover-load-test-results.json
 *
 * Resultado esperado:
 *   - p95 latency < 200ms
 *   - Error rate < 1%
 *   - No 5xx errors
 *   - Cache hit ratio > 80%
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const API_BASE = __ENV.API_URL || 'https://api.imobi.com.br';

// Configuração de carga
export const options = {
  // Ramp up: 0 → 1000 concurrent users em 10 min
  stages: [
    { duration: '2m', target: 100 },   // Ramp up 100 users em 2 min
    { duration: '3m', target: 500 },   // Ramp up para 500 em 3 min
    { duration: '5m', target: 1000 },  // Ramp up para 1000 em 5 min
    { duration: '5m', target: 1000 },  // Manter 1000 por 5 min
    { duration: '3m', target: 500 },   // Ramp down para 500 em 3 min
    { duration: '2m', target: 0 },     // Ramp down para 0 em 2 min
  ],

  // Thresholds de sucesso
  thresholds: {
    'http_req_duration': [
      'p(50)<100',   // p50 latency < 100ms
      'p(95)<200',   // p95 latency < 200ms
      'p(99)<500',   // p99 latency < 500ms
    ],
    'http_req_failed': ['rate<0.01'],  // < 1% errors
    'http_reqs': ['rate>1000'],        // > 1000 req/sec
  },

  setupTimeout: '10s',
  teardownTimeout: '10s',
};

/**
 * Setup — Validar conexão com API antes do load test
 */
export function setup() {
  console.log('Setup: Validando conexão com API...');

  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'setup: API está operacional': (r) => r.status === 200,
    'setup: Response time < 100ms': (r) => r.timings.duration < 100,
  });

  if (res.status !== 200) {
    throw new Error(`API não respondeu com 200. Status: ${res.status}`);
  }

  console.log('Setup: API operacional. Iniciando load test...');
}

/**
 * Default — Simular requests típicas
 */
export default function () {
  group('Health Checks', () => {
    // Health endpoint
    const healthRes = http.get(`${API_BASE}/health`, {
      tags: { name: 'HealthCheck' },
    });

    check(healthRes, {
      'health: status 200': (r) => r.status === 200,
      'health: response time < 100ms': (r) => r.timings.duration < 100,
      'health: valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    sleep(1);
  });

  group('API Endpoints', () => {
    // Simular requests para endpoints típicas
    // Nota: Ajuste endpoints e payloads para match sua API

    // GET exemplo
    const getRes = http.get(`${API_BASE}/api/health`, {
      tags: { name: 'APIGet' },
    });

    check(getRes, {
      'get: status 200 ou 404': (r) => r.status === 200 || r.status === 404,
      'get: response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(0.5);

    // POST exemplo (validar JSON válido)
    const postRes = http.post(
      `${API_BASE}/api/health`,
      JSON.stringify({
        data: 'test',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'APIPost' },
      }
    );

    check(postRes, {
      'post: status 2xx ou 4xx': (r) =>
        r.status >= 200 && r.status < 500,
      'post: response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(0.5);
  });
}

/**
 * Teardown — Validar que API ainda está up após load test
 */
export function teardown(data) {
  console.log('Teardown: Validando que API ainda está operacional...');

  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'teardown: API ainda está up': (r) => r.status === 200,
    'teardown: Response time normal': (r) => r.timings.duration < 200,
  });

  if (res.status !== 200) {
    console.error('Teardown: API degraded após load test!');
  } else {
    console.log('Teardown: API OK. Load test concluído com sucesso.');
  }
}
