import http from 'k6/http';
import { check, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  vus: 500,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/obras?page=1&limit=5`],
    ['GET', `${BASE_URL}/credito/simular?valor=100000&prazo=60`],
  ]);

  responses.forEach((response) => {
    const success = check(response, {
      'status 200': (r) => r.status === 200,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (!success) {
      errorRate.add(true);
    }
  });
}
