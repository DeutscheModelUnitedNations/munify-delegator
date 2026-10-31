import { describe, expect, test, vi } from 'vitest';
import { errorReport, forwardErrors, logger } from './logger';

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
