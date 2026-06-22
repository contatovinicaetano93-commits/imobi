import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const NODE20_DIR = "node-v20.19.0-win-x64";

/** Metro indexa e resolve pelo mesmo path — sem junction C:\\imobi-dev. */
export function resolveWorkRoot(mobileRoot) {
  return { cwd: mobileRoot, mobileRoot };
}

export function loadEnvFile(mobileRoot) {
  for (const name of [".env", ".env.local"]) {
    const envPath = path.join(mobileRoot, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      process.env[key] = value;
    }
  }
}

/** Keep API URL aligned with current Wi-Fi IP for physical devices. */
export function syncApiUrlToLan(mobileRoot) {
  const lanIp = getLanIp();
  const apiPort = process.env.API_PORT ?? "4001";
  const apiUrl = `http://${lanIp}:${apiPort}`;
  process.env.EXPO_PUBLIC_API_URL = apiUrl;

  const envPath = path.join(mobileRoot, ".env");
  if (!fs.existsSync(envPath)) return apiUrl;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (!line.startsWith("EXPO_PUBLIC_API_URL=")) return line;
    found = true;
    return `EXPO_PUBLIC_API_URL=${apiUrl}`;
  });
  if (!found) next.push(`EXPO_PUBLIC_API_URL=${apiUrl}`);
  fs.writeFileSync(envPath, `${next.join("\n").trimEnd()}\n`, "utf8");
  return apiUrl;
}

/** Limpa sessão no iPhone na próxima abertura do app (dev). */
export function syncDevForceLogin(mobileRoot, enabled = true) {
  const key = "EXPO_PUBLIC_DEV_FORCE_LOGIN";
  const value = enabled ? "1" : "0";
  process.env[key] = value;

  const envPath = path.join(mobileRoot, ".env");
  const lines = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8").split(/\r?\n/)
    : [];
  let found = false;
  const next = lines.filter((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return false;
    }
    return line.trim() !== "";
  });
  next.push(`${key}=${value}`);
  fs.writeFileSync(envPath, `${next.join("\n")}\n`, "utf8");
}

export function resolveNodeBin(workRoot, fallbackRoot = workRoot) {
  if (process.platform !== "win32") return process.execPath;

  for (const root of [workRoot, fallbackRoot]) {
    const bundled = path.join(root, ".tools", NODE20_DIR, "node.exe");
    if (!fs.existsSync(bundled)) continue;

    const major = Number(process.version.slice(1).split(".")[0]);
    if (major !== 20) {
      console.log(
        `Node ${process.version} → usando Node 20 bundled (.tools/${NODE20_DIR})\n`,
      );
    }
    return bundled;
  }
  return process.execPath;
}

export function getLanIp() {
  const candidates = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      candidates.push(net.address);
    }
  }
  // Hotspot do iPhone: PC em 172.20.10.x — melhor rota quando LAN doméstica falha
  return (
    candidates.find((ip) => ip.startsWith("172.20.10.")) ??
    candidates.find((ip) => ip.startsWith("192.168.")) ??
    candidates.find((ip) => ip.startsWith("10.")) ??
    candidates.find((ip) => !ip.startsWith("172.")) ??
    candidates[0] ??
    "localhost"
  );
}

/** Libera portas Metro + API no firewall do Windows (requer Admin na 1ª vez). */
export function ensureFirewallRules(apiPort = "4001") {
  if (process.platform !== "win32") return;
  const rules = [
    ["Expo Metro 8081", "8081"],
    ["Expo Metro 8082", "8082"],
    ["Imbobi API 4000", "4000"],
    [`Imbobi API ${apiPort}`, apiPort],
  ];
  for (const [name, port] of rules) {
    try {
      execSync(
        `netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=TCP localport=${port}`,
        { stdio: "ignore" },
      );
    } catch {
      // sem permissão de admin — usuário roda open-firewall.ps1 manualmente
    }
  }
}

export function freeMetroPorts(ports = [8081, 8082, 8083, 19000, 19001]) {
  if (process.platform !== "win32") return;
  const list = ports.join(",");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      execSync(
        `powershell -NoProfile -Command "$ports=@(${list}); foreach($p in $ports){ Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }; Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"`,
        { stdio: "ignore" },
      );
    } catch {
      // ignore
    }
  }
}

export function buildExpoEnv(mobileRoot, extraEnv = {}, nodeBin = process.execPath) {
  const nodeDir = path.dirname(nodeBin);
  const pathPrefix =
    process.platform === "win32" ? `${nodeDir};${process.env.PATH ?? ""}` : `${nodeDir}:${process.env.PATH ?? ""}`;

  return {
    ...process.env,
    PATH: pathPrefix,
    CHOKIDAR_USEPOLLING: "1",
    CHOKIDAR_INTERVAL: "2000",
    EXPO_NO_DEPENDENCY_VALIDATION: "1",
    EXPO_NO_METRO_LAZY: "1",
    METRO_DISABLE_WATCHMAN: "1",
    ...extraEnv,
  };
}

export function spawnExpo(mobileRoot, args, extraEnv = {}) {
  const nodeBin = resolveNodeBin(mobileRoot);
  const expoCli = path.join(mobileRoot, "node_modules", "expo", "bin", "cli");

  if (!fs.existsSync(expoCli)) {
    throw new Error(`expo CLI não encontrado: ${expoCli}`);
  }

  return spawn(nodeBin, [expoCli, ...args], {
    cwd: mobileRoot,
    env: buildExpoEnv(mobileRoot, extraEnv, nodeBin),
    stdio: "inherit",
    shell: false,
  });
}
