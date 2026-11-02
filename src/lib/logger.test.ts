import { describe, expect, test, vi } from 'vitest';
import { INVALID_SPAN_CONTEXT, SpanStatusCode, trace } from '@opentelemetry/api';
import { errorReport, forwardErrors, logger, serializeError } from './logger';

describe('serializeError', () => {
	function circular() {
		const client: Record<string, unknown> = { host: 'smtp' };
		client.self = client;
		return client;
	}

	test('keeps message, stack and fields that serialize, and names the ones that do not', () => {
		const err = Object.assign(new Error('boom'), { code: 'ESOCKET', client: circular() });
		const serialized = serializeError(err);

		expect(serialized).toMatchObject({
			type: 'Error',
			message: 'boom',
			stack: err.stack,
			code: 'ESOCKET',
			client: '[unserializable Object]'
		});
		expect(() => JSON.stringify(serialized)).not.toThrow();
	});

	test('does the same for the errors of an AggregateError', () => {
		const inner = Object.assign(new Error('inner'), { socket: circular() });
		const serialized = serializeError(new AggregateError([inner], 'outer'));

		expect(serialized).toMatchObject({
			message: 'outer',
			aggregateErrors: [{ message: 'inner', socket: '[unserializable Object]' }]
		});
		expect(() => JSON.stringify(serialized)).not.toThrow();
	});

	test('leaves what is not an error alone', () => {
		expect(serializeError('text')).toBe('text');
	});
});

describe('errorReport', () => {
	test('takes the error out of the line and keeps the rest as fields', () => {
		const err = new Error('boom');
		expect(errorReport({ message: 'Failed', data: err })).toEqual({
			message: 'Failed',
			error: err,
			fields: {}
		});
		expect(errorReport({ message: 'Failed', data: { userId: 'u1', err } })).toEqual({
			message: 'Failed',
			error: err,
			fields: { userId: 'u1' }
		});
	});

	test('has no error when the line carries none', () => {
		expect(errorReport({ message: 'Failed', data: { userId: 'u1' } })).toEqual({
			message: 'Failed',
			error: undefined,
			fields: { userId: 'u1' }
		});
		expect(errorReport({ message: 'Failed', data: ['a'] }).fields).toEqual({ data: ['a'] });
		expect(errorReport({ message: 'Failed' }).fields).toEqual({});
	});
});

describe('forwardErrors', () => {
	test('hands error lines to the sink, of child loggers too, and nothing else', () => {
		const sink = vi.fn();
		const stop = forwardErrors(sink);
		const err = new Error('boom');

		logger.warn('Only a warning', err);
		logger.error('Failed', err);
		logger.child({ job: 'x' }).error('Child failed', { id: 1 });
		expect(sink.mock.calls).toEqual([
			[{ message: 'Failed', error: err, fields: {} }],
			[{ message: 'Child failed', error: undefined, fields: { id: 1 } }]
		]);

		stop();
		logger.error('After stopping');
		expect(sink).toHaveBeenCalledTimes(2);
	});
});

describe('the active span', () => {
	function spanSpy() {
		const span = trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
		vi.spyOn(trace, 'getActiveSpan').mockReturnValue(span);
		return {
			addEvent: vi.spyOn(span, 'addEvent'),
			recordException: vi.spyOn(span, 'recordException'),
			setStatus: vi.spyOn(span, 'setStatus')
		};
	}

	test('gets each line as an event, with its fields flattened to primitives', () => {
		const span = spanSpy();
		const err = new Error('boom');
		logger.info('Saved', { id: 'a', count: 2, done: true, gone: undefined, ids: ['x'], err });

		expect(span.addEvent).toHaveBeenCalledWith('Saved', {
			'log.level': 'info',
			id: 'a',
			count: 2,
			done: true,
			gone: undefined,
			ids: '["x"]',
			'err.message': 'boom',
			'err.stack': err.stack
		});
		expect(span.setStatus).not.toHaveBeenCalled();
		vi.restoreAllMocks();
	});

	test('keeps a value that is not an object under `data`, and an error without a stack bare', () => {
		const span = spanSpy();
		const err = new Error('boom');
		err.stack = undefined;
		logger.warn('Odd', 'text');
		logger.warn('No stack', err);

		expect(span.addEvent).toHaveBeenNthCalledWith(1, 'Odd', { 'log.level': 'warn', data: 'text' });
		expect(span.addEvent).toHaveBeenNthCalledWith(2, 'No stack', {
			'log.level': 'warn',
			'err.message': 'boom'
		});
		vi.restoreAllMocks();
	});

	test('is marked failed by an error line, with the exception recorded', () => {
		const span = spanSpy();
		const err = new Error('boom');
		logger.error('Failed', err);
		logger.error('Failed without one');

		expect(span.recordException).toHaveBeenCalledExactlyOnceWith(err);
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR, message: 'Failed' });
		expect(span.setStatus).toHaveBeenCalledTimes(2);
		vi.restoreAllMocks();
	});
});
