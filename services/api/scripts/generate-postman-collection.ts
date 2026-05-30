#!/usr/bin/env node
/**
 * Generate Postman Collection from OpenAPI/Swagger spec
 * Usage: npx ts-node scripts/generate-postman-collection.ts
 * Output: dist/imbobi-api.postman_collection.json
 */

import fs from "fs";
import path from "path";

interface OpenAPISpec {
  info: { title: string; description?: string; version: string };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, any>>;
  components: { schemas: Record<string, any> };
}

function generatePostmanCollection(openApiSpec: OpenAPISpec) {
  const baseUrl = openApiSpec.servers?.[0]?.url || "http://localhost:4000/api/v1";

  const items: any[] = [];

  // Organize endpoints by tag
  const endpointsByTag: Record<string, any[]> = {};

  for (const [path, methods] of Object.entries(openApiSpec.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())) {
        const tags = details.tags || ["General"];
        const tag = tags[0];

        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }

        const requestBody = details.requestBody?.content?.["application/json"]?.schema;
        const responses = details.responses || {};

        endpointsByTag[tag].push({
          name: details.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{access_token}}" },
            ],
            body: requestBody
              ? {
                  mode: "raw",
                  raw: JSON.stringify(
                    generateExampleFromSchema(requestBody),
                    null,
                    2
                  ),
                }
              : undefined,
            url: {
              raw: `${baseUrl}${path}`,
              protocol: baseUrl.split("://")[0],
              host: baseUrl.split("://")[1].split("/")[0],
              path: ["api", "v1", ...path.split("/").filter(Boolean)],
            },
          },
          response: Object.entries(responses).map(([status, response]: any) => ({
            name: `${status} - ${response.description || "Response"}`,
            status: parseInt(status),
            code: parseInt(status),
            _postman_previewlanguage: "json",
          })),
        });
      }
    }
  }

  // Create folder structure
  for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    items.push({
      name: tag,
      item: endpoints,
    });
  }

  // Add authentication endpoint documentation
  items.unshift({
    name: "Authentication Setup",
    item: [
      {
        name: "Set Access Token (POST /auth/login first, then use this)",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'if (pm.response.code === 200) {',
                '  var jsonData = pm.response.json();',
                '  pm.environment.set("access_token", jsonData.accessToken);',
                '  pm.environment.set("refresh_token", jsonData.refreshToken);',
                '  console.log("✓ Access token saved to environment");',
                "}",
              ],
              type: "text/javascript",
            },
          },
        ],
      },
    ],
  });

  const collection = {
    info: {
      name: `${openApiSpec.info.title} - Postman Collection`,
      description: openApiSpec.info.description,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
    variable: [
      {
        key: "base_url",
        value: baseUrl,
        type: "string",
      },
      {
        key: "access_token",
        value: "",
        type: "string",
      },
      {
        key: "refresh_token",
        value: "",
        type: "string",
      },
    ],
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{access_token}}",
          type: "string",
        },
      ],
    },
  };

  return collection;
}

function generateExampleFromSchema(schema: any): any {
  if (schema.example) return schema.example;

  switch (schema.type) {
    case "string":
      return schema.enum?.[0] || "string";
    case "integer":
      return 0;
    case "number":
      return 0.0;
    case "boolean":
      return true;
    case "array":
      return [generateExampleFromSchema(schema.items || {})];
    case "object":
      const obj: any = {};
      for (const [key, prop] of Object.entries(schema.properties || {})) {
        obj[key] = generateExampleFromSchema(prop as any);
      }
      return obj;
    default:
      return null;
  }
}

// Main execution
async function main() {
  try {
    // Read the generated OpenAPI spec
    const openApiPath = path.resolve(__dirname, "../dist/openapi.json");

    if (!fs.existsSync(openApiPath)) {
      console.error(
        `❌ OpenAPI spec not found at ${openApiPath}. ` +
        "Run 'pnpm build' first to generate it."
      );
      process.exit(1);
    }

    const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, "utf-8")) as OpenAPISpec;
    const collection = generatePostmanCollection(openApiSpec);

    // Write Postman collection
    const outputDir = path.resolve(__dirname, "../dist");
    const outputPath = path.join(outputDir, "imbobi-api.postman_collection.json");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Postman collection generated: ${outputPath}`);
    console.log(`\nImport into Postman:`);
    console.log(`1. Open Postman`);
    console.log(`2. Click "Import" (top-left)`);
    console.log(`3. Select file: dist/imbobi-api.postman_collection.json`);
    console.log(`4. Set environment variable 'access_token' after login`);
  } catch (error) {
    console.error("❌ Error generating Postman collection:", error);
    process.exit(1);
  }
}

void main();
