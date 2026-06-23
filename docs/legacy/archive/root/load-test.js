// k6 Load Test Script for imbobi API
// This script simulates 50 concurrent users over 5 minutes
// Usage: k6 run load-test.js
// Note: k6 must be installed - visit https://k6.io/docs/getting-started/installation/

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const healthCheckSuccess = new Counter('health_check_success');
const healthCheckFailed = new Counter('health_check_failed');
const concurrentUsers = new Gauge('concurrent_users');

// Load test configuration
export const options = {
  // Stages: ramp up 1min to 50 users, hold for 3min, ramp down 1min to 0
  stages: [
    { duration: '1m', target: 50 },      // Ramp-up
    { duration: '3m', target: 50 },      // Sustain
    { duration: '1m', target: 0 },       // Ramp-down
  ],
  // Thresholds for pass/fail
  thresholds: {
    'http_req_duration': ['p(95)<800', 'p(99)<1000'],  // 95th percentile < 800ms, 99th < 1000ms
    'http_req_failed': ['rate<0.1'],                    // error rate < 10%
    'errors': ['rate<0.05'],                            // custom error rate < 5%
  },
  // Timeouts
  httpDebug: 'full',
};

const API_URL = __ENV.API_URL || 'http://localhost:4000';
const API_ENDPOINT = `${API_URL}/api/v1`;

export default function () {
  // Track concurrent users
  concurrentUsers.add(__VU);

  group('Health Check', function () {
    const res = http.get(`${API_ENDPOINT}/health`);

    const checkResult = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has status field': (r) => r.body.includes('status'),
      'has redis status': (r) => r.body.includes('redis'),
    });

    if (checkResult) {
      healthCheckSuccess.add(1);
    } else {
      healthCheckFailed.add(1);
      errorRate.add(1);
    }

    responseTime.add(res.timings.duration);
  });

  // Small delay between requests
  sleep(1);
}

// Summary function - runs after test completes
export function handleSummary(data) {
  // Print summary to stdout and save to file
  console.log('=== Load Test Summary ===');
  console.log(`Total HTTP requests: ${data.metrics.http_reqs?.values?.count || 0}`);
  console.log(`Failed requests: ${data.metrics.http_req_failed?.values?.fails || 0}`);
  console.log(`Success rate: ${((1 - (data.metrics.http_req_failed?.values?.rate || 0)) * 100).toFixed(2)}%`);

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-summary.json': JSON.stringify(data, null, 2),
  };
}

// Helper function to format text summary
function textSummary(data, options) {
  let summary = '\n=== Load Test Results ===\n';

  if (data.metrics) {
    // Response time metrics
    const respTime = data.metrics.http_req_duration?.values;
    if (respTime) {
      summary += `\nResponse Time:\n`;
      summary += `  Min: ${respTime.min?.toFixed(2) || 'N/A'}ms\n`;
      summary += `  Max: ${respTime.max?.toFixed(2) || 'N/A'}ms\n`;
      summary += `  Avg: ${respTime.avg?.toFixed(2) || 'N/A'}ms\n`;
      summary += `  p(50): ${respTime.med?.toFixed(2) || 'N/A'}ms\n`;
      summary += `  p(95): ${respTime.p95?.toFixed(2) || 'N/A'}ms\n`;
      summary += `  p(99): ${respTime.p99?.toFixed(2) || 'N/A'}ms\n`;
    }

    // Request metrics
    const httpReqs = data.metrics.http_reqs?.values;
    if (httpReqs) {
      summary += `\nRequests:\n`;
      summary += `  Total: ${httpReqs.count}\n`;
      summary += `  Rate: ${httpReqs.rate?.toFixed(2) || 'N/A'} req/s\n`;
    }

    // Error metrics
    const httpFailed = data.metrics.http_req_failed?.values;
    if (httpFailed) {
      summary += `\nErrors:\n`;
      summary += `  Failed requests: ${httpFailed.fails}\n`;
      summary += `  Error rate: ${(httpFailed.rate * 100).toFixed(2)}%\n`;
    }

    // VU metrics
    const iterationMetrics = data.metrics.iterations?.values;
    if (iterationMetrics) {
      summary += `\nIterations:\n`;
      summary += `  Total: ${iterationMetrics.count}\n`;
      summary += `  Rate: ${iterationMetrics.rate?.toFixed(2) || 'N/A'} iter/s\n`;
    }
  }

  return summary;
}
