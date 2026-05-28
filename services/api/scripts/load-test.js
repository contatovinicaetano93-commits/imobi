#!/usr/bin/env node

/**
 * Load Testing Script - autocannon
 * Simulates 100 concurrent users hitting critical endpoints
 *
 * Usage: node scripts/load-test.js
 * Prerequisite: API running on http://localhost:3000
 */

const autocannon = require("autocannon");
const table = require("cli-table3");

const API_BASE = process.env.API_URL || "http://localhost:3000";
const CONCURRENT_USERS = 100;
const DURATION_SECONDS = 30;

const endpoints = [
  {
    name: "Login",
    method: "POST",
    path: "/auth/login",
    body: {
      email: "test@example.com",
      senha: "TestPass123!",
    },
  },
  {
    name: "List Works",
    method: "GET",
    path: "/obras",
  },
  {
    name: "Credit Simulation",
    method: "POST",
    path: "/credito/simular",
    body: {
      valorSolicitado: 10000,
      prazoMeses: 12,
    },
  },
  {
    name: "Get User Profile",
    method: "GET",
    path: "/usuarios/perfil",
  },
  {
    name: "List Credits",
    method: "GET",
    path: "/credito/extratos",
  },
];

async function runLoadTest() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Load Testing - imbobi API");
  console.log(`${"=".repeat(60)}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`${"=".repeat(60)}\n`);

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\nTesting ${endpoint.method} ${endpoint.path}...`);

    const url = `${API_BASE}${endpoint.path}`;

    const options = {
      url,
      connections: CONCURRENT_USERS,
      pipelining: 10,
      duration: DURATION_SECONDS,
      requests: endpoint.body
        ? [
            {
              method: endpoint.method,
              path: endpoint.path,
              body: JSON.stringify(endpoint.body),
              headers: {
                "Content-Type": "application/json",
              },
            },
          ]
        : undefined,
    };

    try {
      const result = await autocannon(options);

      results.push({
        endpoint: endpoint.name,
        method: endpoint.method,
        path: endpoint.path,
        throughput: result.throughput.total,
        latency: {
          p50: result.latency.p50,
          p95: result.latency.p95,
          p99: result.latency.p99,
          mean: result.latency.mean,
        },
        requests: {
          total: result.requests.total,
          sec: result.requests.average,
        },
        errors: result.errors,
        timeouts: result.timeouts,
      });

      console.log(`✓ Completed`);
    } catch (error) {
      console.error(`✗ Failed: ${error.message}`);
    }
  }

  // Print summary table
  console.log("\n" + "=".repeat(120));
  console.log("LOAD TEST RESULTS SUMMARY");
  console.log("=".repeat(120));

  const tableData = new table({
    head: [
      "Endpoint",
      "Avg Latency",
      "p95 Latency",
      "p99 Latency",
      "Throughput (req/s)",
      "Total Requests",
      "Errors",
    ],
    colWidths: [25, 15, 15, 15, 18, 16, 10],
    style: { head: ["green"] },
  });

  results.forEach((r) => {
    tableData.push([
      `${r.endpoint}`,
      `${r.latency.mean.toFixed(1)}ms`,
      `${r.latency.p95.toFixed(1)}ms`,
      `${r.latency.p99.toFixed(1)}ms`,
      `${r.requests.sec.toFixed(2)}`,
      `${r.requests.total}`,
      `${r.errors}`,
    ]);
  });

  console.log(tableData.toString());

  // Performance recommendations
  console.log("\n" + "=".repeat(120));
  console.log("PERFORMANCE TARGETS & RECOMMENDATIONS");
  console.log("=".repeat(120));

  results.forEach((r) => {
    const p95 = r.latency.p95;
    const p99 = r.latency.p99;
    const status = p95 < 200 && p99 < 500 ? "✓ PASS" : "✗ NEEDS OPTIMIZATION";

    console.log(`\n${r.endpoint} - ${status}`);
    console.log(`  Target p95: < 200ms, Actual: ${p95.toFixed(1)}ms`);
    console.log(`  Target p99: < 500ms, Actual: ${p99.toFixed(1)}ms`);

    if (p95 >= 200) {
      console.log(`  → Consider: Add database indexes, implement result caching, reduce N+1 queries`);
    }
    if (r.errors > 0) {
      console.log(`  → Check: Server logs for error details, increase connection pool`);
    }
  });

  console.log("\n" + "=".repeat(120) + "\n");
}

runLoadTest().catch((error) => {
  console.error("Load test failed:", error);
  process.exit(1);
});
