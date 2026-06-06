#!/usr/bin/env node
/**
 * Setup script: gera assets placeholder + .env para rodar no Expo Go.
 * Roda uma vez: node apps/mobile/scripts/setup.mjs
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../assets");
const ENV_PATH = path.resolve(__dirname, "../.env");

// ── PNG gerado em puro Node.js, sem deps ────────────────────────────────────

function uint32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function crc32(buf) {
  const table = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  return Buffer.concat([uint32be(data.length), t, data, uint32be(crc32(Buffer.concat([t, data])))]);
}

function solidPNG(w, h, r, g, b) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Gerar assets ─────────────────────────────────────────────────────────────

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const GREEN = [22, 163, 74]; // Tailwind green-600

const assets = [
  { file: "icon.png",          w: 1024, h: 1024 },
  { file: "adaptive-icon.png", w: 1024, h: 1024 },
  { file: "splash.png",        w: 1284, h: 2778 },
  { file: "favicon.png",       w:   32, h:   32 },
];

for (const { file, w, h } of assets) {
  const dest = path.join(ASSETS_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`  ✓ ${file} já existe`);
    continue;
  }
  fs.writeFileSync(dest, solidPNG(w, h, ...GREEN));
  console.log(`  ✓ ${file} criado (${w}×${h} verde placeholder)`);
}

// ── Criar .env ────────────────────────────────────────────────────────────────

if (fs.existsSync(ENV_PATH)) {
  console.log("\n  ✓ .env já existe — não sobrescrito");
} else {
  // Detecta IP local da máquina para acesso pelo dispositivo físico
  const nets = os.networkInterfaces();
  let localIp = "localhost";
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== "localhost") break;
  }

  const envContent = `# Gerado por scripts/setup.mjs
# Para simulador/emulador use localhost; para dispositivo físico use o IP abaixo.

EXPO_PUBLIC_API_URL=http://${localIp}:4000

# EAS Project ID (necessário apenas para builds via EAS Build)
EAS_PROJECT_ID=
`;

  fs.writeFileSync(ENV_PATH, envContent);
  console.log(`\n  ✓ .env criado com API_URL=http://${localIp}:4000`);
  if (localIp === "localhost") {
    console.log("  ⚠  IP local não detectado — ajuste EXPO_PUBLIC_API_URL manualmente se usar dispositivo físico");
  }
}

console.log("\n✅ Setup concluído! Próximo passo:");
console.log("   cd apps/mobile && npx expo start\n");
