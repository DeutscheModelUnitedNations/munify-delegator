import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { configPrivate } from '$config/private';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace } from '@opentelemetry/api';
import type { Plugin } from 'graphql-yoga';
import {
	SimpleSpanProcessor,
	BatchSpanProcessor,
	type SpanProcessor,
	type SpanExporter,
	type ReadableSpan
} from '@opentelemetry/sdk-trace-base';
import { configPublic } from '$config/public';
import { AttributeNames, SpanNames } from '@pothos/tracing-opentelemetry';
import { print } from 'graphql';

class PrettyConsoleSpanExporter implements SpanExporter {
	export(spans: ReadableSpan[], resultCallback: (result: any) => void): void {
		for (const span of spans) {
			if (span.name === 'graphql.resolve') {
				console.info(
					`[${span.attributes['oidc.user.email'] ?? 'anonymous'}] ${span.attributes['graphql.field.name']}: ${span.attributes['graphql.field.args']}`
				);
			}
		}
		resultCallback({ code: 0 });
	}

	shutdown(): Promise<void> {
		return Promise.resolve();
	}
}

// Create fallback console exporter
const consoleExporter = new PrettyConsoleSpanExporter();
const fallbackProcessor = new SimpleSpanProcessor(consoleExporter);

let activeProcessor: SpanProcessor | undefined;

try {
	if (configPrivate.OTEL_ENDPOINT_URL) {
		const otlpExporter = new OTLPTraceExporter({
			url: configPrivate.OTEL_ENDPOINT_URL,
			headers: configPrivate.OTEL_AUTHORIZATION_HEADER
				? { authorization: configPrivate.OTEL_AUTHORIZATION_HEADER }
				: {},
			timeoutMillis: 5000, // 5 second timeout
			concurrencyLimit: 10 // Limit concurrent exports
		});

		// Configure processor based on environment
		activeProcessor =
			configPrivate.NODE_ENV === 'production'
				? new BatchSpanProcessor(otlpExporter, {
						maxQueueSize: 2000,
						scheduledDelayMillis: 5000,
						exportTimeoutMillis: 5000
				  })
				: new SimpleSpanProcessor(otlpExporter);
	} else {
		console.info('No OTEL exporter configured, using console logging fallback');
		activeProcessor = fallbackProcessor;
	}
} catch (error) {
	console.warn('Failed to initialize OTLP exporter, using console logging fallback:', error);
	activeProcessor = fallbackProcessor;
}

const provider = new NodeTracerProvider({
	resource: new Resource({
		[ATTR_SERVICE_NAME]: configPrivate.OTEL_SERVICE_NAME,
		[ATTR_SERVICE_VERSION]: configPrivate.OTEL_SERVICE_VERSION ?? configPublic.PUBLIC_VERSION ?? 'unknown'
	})
});

// Always add fallback processor first
provider.addSpanProcessor(fallbackProcessor);

// Add OTLP processor if available and different from fallback
if (activeProcessor && activeProcessor !== fallbackProcessor) {
	provider.addSpanProcessor(activeProcessor);
}

registerInstrumentations({
	tracerProvider: provider,
	instrumentations: [new HttpInstrumentation()]
});

provider.register();

export const tracer = trace.getTracer('graphql');

export const graphqlYogaTracerPlugin: Plugin = {
	onExecute: ({ setExecuteFn, executeFn }) => {
		setExecuteFn((options) => {
			return tracer.startActiveSpan(
				SpanNames.EXECUTE,
				{
					attributes: {
						[AttributeNames.OPERATION_NAME]: options.operationName ?? undefined,
						[AttributeNames.SOURCE]: print(options.document)
					}
				},
				async (span) => {
					try {
						const result = await executeFn(options);

						return result;
					} catch (error) {
						span.recordException(error as Error);
						throw error;
					} finally {
						span.end();
					}
				}
			);
		});
	}
};
