import { trace } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 * OpenTelemetry for the server, loaded by SvelteKit before any application code
 * (`kit.experimental.instrumentation.server`).
 *
 * Only active when `OTEL_ENDPOINT_URL` names a collector. SvelteKit then emits spans for `handle`,
 * loads and remote functions (`kit.experimental.tracing.server`), rumble one per GraphQL operation
 * and resolver (`otel` in `src/api/rumble.ts`), and the HTTP instrumentation one per incoming and
 * outgoing request - all into the provider registered here.
 *
 * Reads `process.env` directly: this runs before SvelteKit has set up `$env`.
 */
const endpoint = process.env.OTEL_ENDPOINT_URL;

if (endpoint) {
	const authorization = process.env.OTEL_AUTHORIZATION_HEADER;

	const provider = new NodeTracerProvider({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'MUNIFY-DELEGATOR',
			...(process.env.OTEL_SERVICE_VERSION
				? { [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION }
				: {})
		}),
		spanProcessors: [
			new BatchSpanProcessor(
				new OTLPTraceExporter({
					url: endpoint,
					headers: authorization ? { Authorization: authorization } : undefined
				})
			)
		]
	});
	provider.register();

	registerInstrumentations({
		tracerProvider: provider,
		instrumentations: [new HttpInstrumentation()]
	});

	trace.getTracer('munify-delegator').startSpan('startup').end();
}
