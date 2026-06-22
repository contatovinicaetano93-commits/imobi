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

export function initializeTracing() {
  const traceExporterUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!traceExporterUrl) {
    console.log('[TRACING] Disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)');
    return null;
  }

  try {
    // Dynamic import to avoid hard dependency
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'imobi-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
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
