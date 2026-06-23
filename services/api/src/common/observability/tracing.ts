/**
 * OpenTelemetry Distributed Tracing Configuration
 *
 * To enable distributed tracing, install OpenTelemetry packages:
 * pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
 *          @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources \
 *          @opentelemetry/semantic-conventions
 *
 * Then set: OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 */

export async function initializeTracing() {
  const traceExporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!traceExporterUrl) {
    console.log('[TRACING] Disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)');
    return null;
  }

  try {
    // Runtime-only imports — OTEL packages are optional (not in package.json)
    const load = (specifier: string): Promise<Record<string, unknown>> =>
      new Function("s", "return import(s)")(specifier) as Promise<Record<string, unknown>>;

    const [sdkNode, autoInstr, otlpExporter, resources, semconv] = await Promise.all([
      load("@opentelemetry/sdk-node"),
      load("@opentelemetry/auto-instrumentations-node"),
      load("@opentelemetry/exporter-trace-otlp-http"),
      load("@opentelemetry/resources"),
      load("@opentelemetry/semantic-conventions"),
    ]);

    const NodeSDK = sdkNode["NodeSDK"] as new (config: Record<string, unknown>) => {
      start: () => void;
    };
    const getNodeAutoInstrumentations = autoInstr["getNodeAutoInstrumentations"] as () => unknown;
    const OTLPTraceExporter = otlpExporter["OTLPTraceExporter"] as new (config: {
      url: string;
    }) => unknown;
    const Resource = resources["Resource"] as new (attrs: Record<string, string>) => unknown;
    const SemanticResourceAttributes = semconv["SemanticResourceAttributes"] as Record<
      string,
      string
    >;

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "imobi-api",
        [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
      }),
      instrumentations: [getNodeAutoInstrumentations()],
      traceExporter: new OTLPTraceExporter({
        url: `${traceExporterUrl}/v1/traces`,
      }),
    });

    sdk.start();
    console.log('[TRACING] OpenTelemetry initialized, endpoint:', traceExporterUrl);
    return sdk;
  } catch (error) {
    console.log('[TRACING] OpenTelemetry packages not installed, skipping initialization');
    console.log('[TRACING] To enable: pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node');
    return null;
  }
}
