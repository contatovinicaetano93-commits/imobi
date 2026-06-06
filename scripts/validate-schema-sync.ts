#!/usr/bin/env tsx
/**
 * Validates that every Zod enum in packages/schemas matches the corresponding
 * Prisma enum in services/api/prisma/schema.prisma.
 *
 * Run: pnpm tsx scripts/validate-schema-sync.ts
 * Add to CI: runs after pnpm type-check
 */
import fs from "fs";
import path from "path";

const PRISMA_SCHEMA = path.resolve(
  __dirname,
  "../services/api/prisma/schema.prisma"
);

function parsePrismaEnums(content: string): Record<string, string[]> {
  const enums: Record<string, string[]> = {};
  const enumBlockRe = /^enum\s+(\w+)\s*\{([^}]+)\}/gm;
  let match: RegExpExecArray | null;
  while ((match = enumBlockRe.exec(content)) !== null) {
    const name = match[1];
    const values = match[2]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"));
    enums[name] = values;
  }
  return enums;
}

const prismaContent = fs.readFileSync(PRISMA_SCHEMA, "utf-8");
const prismaEnums = parsePrismaEnums(prismaContent);

// Map: Zod enum name → Prisma enum name → expected values
const checks: Array<{
  zodFile: string;
  zodExport: string;
  prismaEnum: string;
}> = [
  {
    zodFile: "packages/schemas/src/obra.schema.ts",
    zodExport: "StatusObraEnum",
    prismaEnum: "ObraStatus",
  },
  {
    zodFile: "packages/schemas/src/obra.schema.ts",
    zodExport: "StatusEtapaEnum",
    prismaEnum: "EtapaStatus",
  },
  {
    zodFile: "packages/schemas/src/credito.schema.ts",
    zodExport: "StatusCreditoEnum",
    prismaEnum: "CreditoStatus",
  },
  {
    zodFile: "packages/schemas/src/usuario.schema.ts",
    zodExport: "KycStatusEnum",
    prismaEnum: "KycStatus",
  },
  {
    zodFile: "packages/schemas/src/usuario.schema.ts",
    zodExport: "TipoUsuarioEnum",
    prismaEnum: "UsuarioTipo",
  },
  {
    zodFile: "packages/schemas/src/comercial.schema.ts",
    zodExport: "FonteEnum",
    prismaEnum: "LeadFonte",
  },
  {
    zodFile: "packages/schemas/src/comercial.schema.ts",
    zodExport: "LeadActivityTypeEnum",
    prismaEnum: "LeadActivityTipo",
  },
];

function extractZodEnumValues(
  fileContent: string,
  exportName: string
): string[] | null {
  const re = new RegExp(
    `export\\s+const\\s+${exportName}\\s*=\\s*z\\.enum\\(\\[([^\\]]+)\\]`,
    "s"
  );
  const m = fileContent.match(re);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, ""))
    .filter(Boolean);
}

let errors = 0;
const root = path.resolve(__dirname, "..");

for (const check of checks) {
  const zodPath = path.resolve(root, check.zodFile);
  if (!fs.existsSync(zodPath)) {
    console.error(`❌  File not found: ${check.zodFile}`);
    errors++;
    continue;
  }

  const zodContent = fs.readFileSync(zodPath, "utf-8");
  const zodValues = extractZodEnumValues(zodContent, check.zodExport);
  if (!zodValues) {
    console.error(
      `❌  Could not find ${check.zodExport} in ${check.zodFile}`
    );
    errors++;
    continue;
  }

  const prismaValues = prismaEnums[check.prismaEnum];
  if (!prismaValues) {
    console.error(
      `❌  Prisma enum '${check.prismaEnum}' not found in schema.prisma`
    );
    errors++;
    continue;
  }

  const zodSet = new Set(zodValues);
  const prismaSet = new Set(prismaValues);

  const missingInZod = prismaValues.filter((v) => !zodSet.has(v));
  const extraInZod = zodValues.filter((v) => !prismaSet.has(v));

  if (missingInZod.length > 0 || extraInZod.length > 0) {
    console.error(
      `❌  ${check.zodExport} (${check.zodFile}) ↔ ${check.prismaEnum} (schema.prisma)`
    );
    if (missingInZod.length)
      console.error(`     Missing in Zod:  ${missingInZod.join(", ")}`);
    if (extraInZod.length)
      console.error(`     Extra in Zod:    ${extraInZod.join(", ")}`);
    errors++;
  } else {
    console.log(
      `✅  ${check.zodExport} ↔ ${check.prismaEnum} — ${zodValues.length} values match`
    );
  }
}

if (errors > 0) {
  console.error(`\n${errors} schema sync error(s). Fix before deploying.`);
  process.exit(1);
} else {
  console.log("\nAll Zod enums are in sync with Prisma. ✓");
}
