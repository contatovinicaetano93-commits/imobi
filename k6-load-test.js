import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Gauge, Rate } from 'k6/metrics';

// Custom metrics
const apiDuration = new Trend('api_duration');
const loginErrors = new Counter('login_errors');
const healthCheckRate = new Rate('health_check_success');
const activeConnections = new Gauge('active_connections');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up: 0->10 users
    { duration: '1m', target: 50 },    // Ramp up: 10->50 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Spike to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Cool down: 100->0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.1'],
    'health_check_success': ['rate>0.95'],
    'api_duration': ['avg<300', 'max<1000'],
  },
};

const API_BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export default function () {
  activeConnections.add(1);

  // 1. Health Check
  const healthRes = http.get(`${API_BASE_URL}/api/v1/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });
  apiDuration.add(healthRes.timings.duration);
  healthCheckRate.add(healthRes.status === 200);

  // 2. Test Auth Endpoints (with proper error handling)
  const loginPayload = JSON.stringify({
    email: `user${__VU}@test.com`,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${API_BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200 || loginRes.status === 401) {
    // 401 is expected for non-existent user, 200 for valid credentials
    check(loginRes, {
      'login endpoint responds': (r) => r.status !== 500,
    });
  } else {
    loginErrors.add(1);
  }
  apiDuration.add(loginRes.timings.duration);

  // 3. Test Signup Endpoint
  const signupPayload = JSON.stringify({
    nome: `User ${__VU}`,
    cpf: `${String(__VU).padStart(11, '0')}`,
    email: `user${__VU}${Date.now()}@test.com`,
    telefone: '11999999999',
    senha: 'TestPassword123!',
  });

  const signupRes = http.post(`${API_BASE_URL}/api/v1/auth/registrar`, signupPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(signupRes, {
    'signup endpoint responds': (r) => r.status !== 500,
    'signup does not cause timeout': (r) => r.timings.duration < 2000,
  });
  apiDuration.add(signupRes.timings.duration);

  // 4. Test Credit Simulator
  const creditPayload = JSON.stringify({
    valor: 50000,
    prazo: 24,
  });

  const creditRes = http.post(`${API_BASE_URL}/api/v1/credito/simular`, creditPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(creditRes, {
    'credit simulator responds': (r) => r.status !== 500,
    'credit simulator response time < 300ms': (r) => r.timings.duration < 300,
  });
  apiDuration.add(creditRes.timings.duration);

  // 5. Test Works Endpoint
  const obrasRes = http.get(`${API_BASE_URL}/api/v1/obras`, {
    headers: {
      'Authorization': 'Bearer invalid-token', // Testing auth handling
    },
  });

  check(obrasRes, {
    'obras endpoint handles invalid token': (r) => r.status === 401 || r.status === 403,
  });
  apiDuration.add(obrasRes.timings.duration);

  activeConnections.add(-1);
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  let summary = '\n╔════════════════════════════════════════════════════════════════╗\n';
  summary += '║             k6 Load Test Summary                              ║\n';
  summary += '╚════════════════════════════════════════════════════════════════╝\n\n';

  if (data.metrics) {
    summary += 'HTTP Metrics:\n';
    if (data.metrics.http_req_duration) {
      const dur = data.metrics.http_req_duration.values;
      summary += `  Response Time: avg=${dur.avg.toFixed(0)}ms, p95=${dur['p(95)'].toFixed(0)}ms, p99=${dur['p(99)'].toFixed(0)}ms\n`;
    }
    if (data.metrics.http_req_failed) {
      summary += `  Failed Requests: ${data.metrics.http_req_failed.values.rate.toFixed(2)}%\n`;
    }

    summary += '\nCustom Metrics:\n';
    if (data.metrics.api_duration) {
      const dur = data.metrics.api_duration.values;
      summary += `  API Duration: avg=${dur.avg.toFixed(0)}ms, max=${dur.max.toFixed(0)}ms\n`;
    }
    if (data.metrics.health_check_success) {
      summary += `  Health Check Success Rate: ${(data.metrics.health_check_success.values.rate * 100).toFixed(2)}%\n`;
    }
    if (data.metrics.login_errors) {
      summary += `  Login Errors: ${data.metrics.login_errors.values.count}\n`;
    }
  }

  summary += '\n✓ Load test completed\n';
  return summary;
}
