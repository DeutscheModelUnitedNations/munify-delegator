import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
// import prisInstru from '@prisma/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { configPrivate } from '$config/private';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace } from '@opentelemetry/api';
import type { Plugin } from 'graphql-yoga';
import {
	SimpleSpanProcessor,
	BatchSpanProcessor,
	type SpanProcessor
} from '@opentelemetry/sdk-trace-base';
import { configPublic } from '$config/public';
import { AttributeNames, SpanNames } from '@pothos/tracing-opentelemetry';
import { print } from 'graphql';

const headers: Record<string, string> = {};

if (configPrivate.OTEL_AUTHORIZATION_HEADER) {
	headers.authorization = configPrivate.OTEL_AUTHORIZATION_HEADER;
}

const exporter = configPrivate.OTEL_ENDPOINT_URL
	? new OTLPTraceExporter({
			url: configPrivate.OTEL_ENDPOINT_URL,
			headers
		})
	: undefined;

const processors: SpanProcessor[] = [];
if (exporter) {
	if (configPrivate.NODE_ENV !== 'production') {
		processors.push(new SimpleSpanProcessor(exporter));
	} else {
		processors.push(new BatchSpanProcessor(exporter));
	}
}

const provider = new NodeTracerProvider({
	spanProcessors: processors,
	resource: new Resource({
		[ATTR_SERVICE_NAME]: configPrivate.OTEL_SERVICE_NAME,
		[ATTR_SERVICE_VERSION]:
			configPrivate.OTEL_SERVICE_VERSION ?? configPublic.PUBLIC_VERSION ?? 'unknown'
	})
});

registerInstrumentations({
	tracerProvider: provider,
	instrumentations: [
		new HttpInstrumentation()
		// new prisInstru.PrismaInstrumentation({
		// 	middleware: true
		// })
	]
});

provider.register();

export const tracer = trace.getTracer('graphql');

export const graphqlYogaTracerPlugin: Plugin = {
	onExecute: ({ setExecuteFn, executeFn }) => {
		setExecuteFn((options) =>
			tracer.startActiveSpan(
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
			)
		);
	}
};
