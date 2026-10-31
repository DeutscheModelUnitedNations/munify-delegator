import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
	CompositePropagator,
	W3CBaggagePropagator,
	W3CTraceContextPropagator
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

/**
 * OpenTelemetry for the server, which SvelteKit finds by its name and loads before any
 * application code.
 *
 * Only active when `OTEL_ENDPOINT_URL` names a collector. SvelteKit then emits spans for `handle`,
 * loads and remote functions (`tracing.server` in `vite.config.ts`), rumble one per GraphQL operation
 * and resolver (`otel` in `src/api/rumble.ts`), and the HTTP instrumentation one per incoming and
 * outgoing request - all into the provider registered here.
 *
 * Reads `process.env` directly: this runs before SvelteKit has set up `$app/env`.
 */
const endpoint = process.env.OTEL_ENDPOINT_URL;

if (endpoint) {
	const authorization = process.env.OTEL_AUTHORIZATION_HEADER;

	// What `NodeTracerProvider.register()` did before OpenTelemetry 3: spans follow the async call
	// chain, and trace context travels in W3C headers.
	context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
	propagation.setGlobalPropagator(
		new CompositePropagator({
			propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()]
		})
	);

	const provider = new TracerProvider({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'MUNIFY-DELEGATOR',
			...(process.env.OTEL_SERVICE_VERSION
				? { [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION }
				: {})
		}),
		spanProcessors: [
			new BatchSpanProcessor({
				exporter: new OTLPTraceExporter({
					url: endpoint,
					headers: authorization ? { Authorization: authorization } : undefined
				})
			})
		]
	});
	trace.setGlobalTracerProvider(provider);

	registerInstrumentations({
		tracerProvider: provider,
		instrumentations: [new HttpInstrumentation()]
	});

	trace.getTracer('munify-delegator').startSpan('startup').end();
}
