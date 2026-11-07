import { SpanStatusCode, isSpanContextValid, trace, type Attributes } from '@opentelemetry/api';
import pino from 'pino';

/**
 * The app's logger (after avv), for the server, the jobs and the browser alike. pino writes JSON
 * lines on the server (pretty ones in development) and falls back to `console` in the browser
 * through its `browser` build.
 *
 * Reads `process.env` directly: the jobs and the seed run outside SvelteKit, and the browser has
 * no `process` at all. `LOG_LEVEL` overrides the level, which is debug in development, silent under
 * vitest and warn otherwise, so production keeps out rumble's line per operation. The jobs log at
 * info (`runJob`, `src/jobs/logs.ts`).
 */
const env = typeof process === 'undefined' ? {} : process.env;
const isDev = env.NODE_ENV === 'development';

// A field as it is if it serializes, otherwise named by its type: one that throws (a circular
// client, a getter that throws) would cost the whole line.
function jsonSafe(value: unknown): unknown {
	try {
		JSON.stringify(value);
		return value;
	} catch {
		const type =
			typeof value === 'object' && value !== null ? value.constructor?.name : typeof value;
		return `[unserializable ${type ?? 'object'}]`;
	}
}

/**
 * pino's error serializer, except that a field it copies from the error which does not serialize
 * is replaced by its type. pino copies every enumerable field of an error as it is, so one holding
 * a socket or a client used to turn the whole line into "unable to serialize", the error with it.
 */
export function serializeError(err: unknown): unknown {
	if (!(err instanceof Error)) return jsonSafe(err);
	return safeErrorFields(pino.stdSerializers.err(err));
}

function safeErrorFields(serialized: unknown): unknown {
	if (typeof serialized !== 'object' || serialized === null) return serialized;
	return Object.fromEntries(
		Object.entries(serialized).map(([key, value]) => [
			key,
			key === 'aggregateErrors' && Array.isArray(value)
				? value.map(safeErrorFields)
				: jsonSafe(value)
		])
	);
}

/**
 * The trace a line was logged in, under OpenTelemetry's names for them (its log data model), so that
 * Grafana links the line in Loki to its trace in Tempo. rumble's lines get them here too: its own
 * (`injectTraceId`) is off in `src/api/rumble.ts`, as pino would write both.
 */
function traceFields() {
	const spanContext = trace.getActiveSpan()?.spanContext();
	if (!spanContext || !isSpanContextValid(spanContext)) return {};
	return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
}

const pinoLogger = pino({
	level: env.LOG_LEVEL ?? (env.VITEST ? 'silent' : isDev ? 'debug' : 'warn'),
	serializers: { err: serializeError },
	mixin: traceFields,
	// Resolved here: pino resolves a bare target from its caller's file, which Vite's module runner
	// leaves nameless, so `'pino-pretty'` alone fails in `vite dev`.
	transport: isDev
		? { target: import.meta.resolve('pino-pretty'), options: { colorize: true } }
		: undefined
});

/**
 * rumble's: a line per GraphQL operation, and an error line for every operation that answered with
 * errors - expected ones (not found, invalid input) included, so it stays out of Sentry.
 */
export const graphqlLogger = pinoLogger.child({ name: 'graphql' });

function toObj(data: unknown): Record<string, unknown> | undefined {
	if (data === undefined) return undefined;
	if (data instanceof Error) return { err: data };
	if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
		return Object.fromEntries(Object.entries(data));
	}
	return { data };
}

// Span event attributes take only primitives (and arrays of them), so anything else is stringified.
function toSpanAttributes(data: unknown): Attributes {
	const attributes: Attributes = {};
	for (const [key, value] of Object.entries(toObj(data) ?? {})) {
		if (value instanceof Error) {
			attributes[`${key}.message`] = value.message;
			if (value.stack) attributes[`${key}.stack`] = value.stack;
		} else if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === undefined
		) {
			attributes[key] = value;
		} else {
			attributes[key] = JSON.stringify(jsonSafe(value));
		}
	}
	return attributes;
}

type Level = 'error' | 'warn' | 'info' | 'debug';

// Mirrors the log onto the active span as an event, so it shows up in the trace it belongs to.
function attachToActiveSpan({
	level,
	message,
	data
}: {
	level: Level;
	message: string;
	data?: unknown;
}) {
	const span = trace.getActiveSpan();
	if (!span) return;

	span.addEvent(message, { 'log.level': level, ...toSpanAttributes(data) });
	if (level === 'error') {
		if (data instanceof Error) span.recordException(data);
		span.setStatus({ code: SpanStatusCode.ERROR, message });
	}
}

/** An error line as an error tracker takes it: the error it carries, and its other fields. */
export type ErrorReport = { message: string; error?: Error; fields: Record<string, unknown> };

export function errorReport({ message, data }: { message: string; data?: unknown }): ErrorReport {
	let error: Error | undefined;
	const fields: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(toObj(data) ?? {})) {
		if (!error && value instanceof Error) error = value;
		else fields[key] = value;
	}
	return { message, error, fields };
}

const errorSinks = new Set<(report: ErrorReport) => void>();

/**
 * Hands every `error` line to `sink` as well; `hooks.client.ts` sends them to Sentry this way. The
 * server needs none: Sentry's pino integration reads the lines there.
 */
export function forwardErrors(sink: (report: ErrorReport) => void) {
	errorSinks.add(sink);
	return () => errorSinks.delete(sink);
}

function makeLevelLoggers(instance: pino.Logger) {
	const log = ({ level, message, data }: { level: Level; message: string; data?: unknown }) => {
		const obj = toObj(data);
		if (obj) instance[level](obj, message);
		else instance[level](message);
		attachToActiveSpan({ level, message, data });
		if (level === 'error') {
			for (const sink of errorSinks) sink(errorReport({ message, data }));
		}
	};

	return {
		error: (message: string, data?: unknown) => log({ level: 'error', message, data }),
		warn: (message: string, data?: unknown) => log({ level: 'warn', message, data }),
		info: (message: string, data?: unknown) => log({ level: 'info', message, data }),
		debug: (message: string, data?: unknown) => log({ level: 'debug', message, data })
	};
}

/**
 * `logger.error('Sending the mail failed', error)`: a message, then whatever goes with it (an
 * error, an object of fields or a single value).
 */
export const logger = {
	...makeLevelLoggers(pinoLogger),
	/**
	 * Changes the level of every line from now on (children created before keep theirs). For a
	 * default of its own, such as the jobs' `info`; `LOG_LEVEL` is still the operator's to set.
	 */
	setLevel: (level: Level | 'silent') => {
		pinoLogger.level = level;
	},
	/** A logger with fields bound to every line (a job's name, a conference id). */
	child: (bindings: Record<string, unknown>) => makeLevelLoggers(pinoLogger.child(bindings))
};
