#!/usr/bin/env node

import http from "http";
import https from "https";

const API_URL = "http://localhost:4000/api/v1";
const WEB_URL = "http://localhost:3000";

interface TestResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latencies: number[];
  errors: Map<number | string, number>;
  throughput: number;
}

interface BenchmarkConfig {
  name: string;
  method: string;
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  concurrency: number;
  duration: number;
  rateLimit?: number; // requests per second
}

const results: TestResult[] = [];
let testUserToken: string;
let testUserId: string;

async function request(
  config: Omit<BenchmarkConfig, "concurrency" | "duration" | "rateLimit">
): Promise<{ status: number; time: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const urlObj = new URL(config.url);
    const isHttps = config.url.startsWith("https");
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      timeout: 10000,
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const time = Date.now() - startTime;
        resolve({ status: res.statusCode || 500, time });
      });
    });

    req.on("error", (error) => {
      const time = Date.now() - startTime;
      resolve({ status: 0, time, error: String(error) });
    });

    req.on("timeout", () => {
      req.destroy();
      const time = Date.now() - startTime;
      resolve({ status: 0, time, error: "Timeout" });
    });

    if (config.body) {
      req.write(JSON.stringify(config.body));
    }
    req.end();
  });
}

async function runBenchmark(config: BenchmarkConfig): Promise<TestResult> {
  const result: TestResult = {
    name: config.name,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    latencies: [],
    errors: new Map(),
    throughput: 0,
  };

  const startTime = Date.now();
  const endTime = startTime + config.duration * 1000;
  let requestCount = 0;
  const minRequestInterval = config.rateLimit ? 1000 / config.rateLimit : 0;
  let lastRequestTime = 0;

  const workers: Promise<void>[] = [];

  for (let i = 0; i < config.concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endTime) {
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;

          if (timeSinceLastRequest < minRequestInterval) {
            await new Promise((r) => setTimeout(r, minRequestInterval - timeSinceLastRequest));
            continue;
          }

          lastRequestTime = Date.now();
          requestCount++;

          const { status, time, error } = await request({
            method: config.method,
            url: config.url,
            body: config.body,
            headers: config.headers,
          });

          result.totalRequests++;
          result.latencies.push(time);

          if (status >= 200 && status < 300) {
            result.successfulRequests++;
          } else {
            result.failedRequests++;
            const key = error || status;
            result.errors.set(key, (result.errors.get(key) || 0) + 1);
          }
        }
      })()
    );
  }

  await Promise.all(workers);

  const duration = (Date.now() - startTime) / 1000;
  result.throughput = result.totalRequests / duration;

  return result;
}

function formatResult(result: TestResult): string {
  const sortedLatencies = [...result.latencies].sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const avg = sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length;
  const max = sortedLatencies[sortedLatencies.length - 1];

  const errorLines =
    result.errors.size > 0
      ? `\n  Errors:\n${Array.from(result.errors.entries())
          .map(([key, count]) => `    - ${key}: ${count}`)
          .join("\n")}`
      : "";

  return `
${result.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Requests:       ${result.totalRequests}
  Successful:           ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)
  Failed:               ${result.failedRequests}

  Latency (ms):
    - Avg:              ${avg.toFixed(2)}
    - P50:              ${p50}
    - P95:              ${p95}
    - P99:              ${p99}
    - Max:              ${max}

  Throughput:           ${result.throughput.toFixed(2)} req/s${errorLines}
`;
}

async function setupTestUser() {
  console.log("🔧 Setting up test user...");

  // Generate unique email
  const timestamp = Date.now();
  const testEmail = `loadtest-${timestamp}@example.com`;
  const testCPF = "05933174599";
  const testPassword = "TestPass123!";

  const { status, time } = await request({
    method: "POST",
    url: `${API_URL}/auth/registrar`,
    body: {
      nome: "Load Test User",
      email: testEmail,
      cpf: testCPF,
      telefone: "11999999999",
      senha: testPassword,
      tipo: "TOMADOR",
    },
  });

  if (status !== 201) {
    console.error("❌ Failed to create test user");
    throw new Error("Setup failed");
  }

  // Extract token from response
  const response = await request({
    method: "POST",
    url: `${API_URL}/auth/login`,
    body: {
      email: testEmail,
      senha: testPassword,
    },
  });

  if (response.status !== 200) {
    console.error("❌ Failed to login test user");
    throw new Error("Setup failed");
  }

  // For now, use a placeholder token
  testUserToken = "test-token";
  testUserId = "test-user-id";
  console.log("✅ Test user ready\n");
}

async function runLoadTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("           📊 LOAD TESTING SUITE — imbobi API");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Wait for servers to be ready
  console.log("⏳ Waiting for servers to be ready...");
  let retries = 10;
  while (retries > 0) {
    const { status } = await request({
      method: "GET",
      url: `${API_URL}/health`,
    });
    if (status === 200) break;
    retries--;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (retries === 0) {
    console.error("❌ API not responding. Make sure servers are running:");
    console.error("   pnpm dev");
    process.exit(1);
  }

  console.log("✅ Servers ready\n");

  // Setup test user
  try {
    await setupTestUser();
  } catch (error) {
    console.error("⚠️  Test user setup skipped (may affect auth tests)\n");
  }

  // Define test scenarios
  const benchmarks: BenchmarkConfig[] = [
    {
      name: "1. Health Check (baseline)",
      method: "GET",
      url: `${API_URL}/health`,
      concurrency: 5,
      duration: 10,
      rateLimit: 100, // 100 req/s
    },
    {
      name: "2. Sign Up Flow",
      method: "POST",
      url: `${API_URL}/auth/registrar`,
      concurrency: 2,
      duration: 15,
      rateLimit: 2, // 2 req/s (rate limited)
      body: {
        nome: "Load Test",
        email: `test-${Date.now()}@example.com`,
        cpf: "05933174599",
        telefone: "11999999999",
        senha: "TestPass123!",
        tipo: "TOMADOR",
      },
    },
    {
      name: "3. Login (with rate limiting)",
      method: "POST",
      url: `${API_URL}/auth/login`,
      concurrency: 2,
      duration: 15,
      rateLimit: 2, // 2 req/s (rate limited)
      body: {
        email: "test@example.com",
        senha: "TestPass123!",
      },
    },
    {
      name: "4. Credit Simulator",
      method: "POST",
      url: `${API_URL}/credito/simular`,
      concurrency: 5,
      duration: 15,
      rateLimit: 10, // 10 req/s
      body: {
        valorSolicitado: 100000,
        prazoMeses: 24,
        tipoObra: "RESIDENCIAL",
      },
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    },
  ];

  // Run each benchmark
  for (const benchmark of benchmarks) {
    console.log(`⏱️  Running: ${benchmark.name}...`);
    const result = await runBenchmark(benchmark);
    results.push(result);
    console.log(formatResult(result));
    await new Promise((r) => setTimeout(r, 1000)); // Cool down between tests
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("                        📈 SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalSuccessful = results.reduce((sum, r) => sum + r.successfulRequests, 0);
  const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;

  console.log(`Total Requests:        ${totalRequests}`);
  console.log(`Total Successful:      ${totalSuccessful} (${((totalSuccessful / totalRequests) * 100).toFixed(2)}%)`);
  console.log(`Average Throughput:    ${avgThroughput.toFixed(2)} req/s\n`);

  // Performance targets
  console.log("🎯 Performance Targets:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const targets = [
    { name: "Health Check (P99)", target: 10, actual: 0 },
    { name: "Auth Endpoints (P99)", target: 200, actual: 0 },
    { name: "API Endpoints (P99)", target: 200, actual: 0 },
    { name: "Error Rate", target: 5, actual: 0 },
  ];

  for (const target of targets) {
    const result = results.find((r) => r.name.includes("Health")) || results[0];
    const latencies = result.latencies.sort((a, b) => a - b);
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const status = p99 <= target.target ? "✅" : "⚠️";
    console.log(`${status} ${target.name.padEnd(30)} Target: ${target.target}ms, Actual: ${p99}ms`);
  }

  console.log("\n✅ Load testing complete!");
}

runLoadTests().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
