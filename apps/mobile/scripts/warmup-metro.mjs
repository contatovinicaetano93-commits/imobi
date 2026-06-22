const IOS_BUNDLE_QUERY =
  "platform=ios&dev=true&hot=false&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForMetro(port, maxAttempts = 80) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
    } catch {
      // Metro still starting
    }
    await sleep(3000);
  }
  return false;
}

/** Pre-build iOS bundle so the phone does not timeout on first connect. */
export async function warmupMetroBundle(port = "8082") {
  const ready = await waitForMetro(port);
  if (!ready) {
    console.warn("\n[WARN] Metro demorou — aguarde mais 1–2 min antes de conectar.\n");
    return false;
  }

  console.log("\n⏳ Pré-compilando bundle iOS (~2–3 min na 1ª vez)...");
  console.log("   ⛔ NÃO conecte o iPhone até ver AGORA SIM abaixo.\n");

  try {
    const entry = "apps/mobile/index.bundle";
    const url = `http://127.0.0.1:${port}/${entry}?${IOS_BUNDLE_QUERY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    await res.arrayBuffer();
    return true;
  } catch (err) {
    console.error(`\n[ERRO] Pré-compilação falhou: ${err.message}`);
    console.error("   Metro não está pronto — NÃO escaneie o QR ainda.\n");
    return false;
  }
}

export function printConnectInstructions(host, port, ready = true) {
  if (!ready) {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║  ⛔ METRO COM ERRO — corrija antes de conectar   ║");
    console.log("╠══════════════════════════════════════════════════╣");
    console.log("║  Veja os erros acima (bundling failed / 500).    ║");
    console.log("║  Ctrl+C → pnpm dev:kill → pnpm dev:hotspot       ║");
    console.log("╚══════════════════════════════════════════════════╝\n");
    return;
  }
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  ✅ AGORA SIM — CONECTE O IPHONE                 ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  URL: exp://${host}:${port}`.padEnd(51) + "║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  1. Safari no iPhone:                            ║");
  console.log(`║     http://${host}:${port}/status`.padEnd(51) + "║");
  console.log("║     Deve mostrar: packager-status:running        ║");
  console.log("║  2. Se Safari falhar → roteador bloqueia LAN    ║");
  console.log("║  3. Expo Go → NÃO use Recentes se era :8081      ║");
  console.log("║  4. Escaneie o QR deste terminal (:8082)          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
}
