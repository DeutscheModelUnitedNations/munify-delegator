import { describe, expect, it, vi } from 'vitest';
import { GraphQLError } from 'graphql';
import { formatError } from './ssrErrors';

vi.mock('$app/env', () => ({ dev: false }));

/** What devalue, which SvelteKit puts remote results into the page with, accepts: no class instances. */
function isPlain(value: unknown): boolean {
	if (value === null || typeof value !== 'object') return true;
	if (Array.isArray(value)) return value.every(isPlain);
	if (Object.getPrototypeOf(value) !== Object.prototype) return false;
	return Object.values(value).every(isPlain);
}

describe('formatError', () => {
	it('keeps an expected error, as a plain object devalue can put into the page', () => {
		const forbidden = new GraphQLError('Zugriff verweigert', {
			path: ['getConferenceStatistics'],
			extensions: { code: 'FORBIDDEN' }
		});

		const formatted = formatError(forbidden);

		expect(formatted).toEqual({
			message: 'Zugriff verweigert',
			path: ['getConferenceStatistics'],
			extensions: { code: 'FORBIDDEN' }
		});
		expect(isPlain(formatted)).toBe(true);
		expect(isPlain(forbidden)).toBe(false);
	});

	it('masks an unexpected error, so a failed statement never reaches the page', () => {
		const failedQuery = new GraphQLError('Failed query: select … params: user-id', {
			path: ['delegation'],
			originalError: new Error('Connection terminated unexpectedly')
		});

		const formatted = formatError(failedQuery);

		expect(formatted).toEqual({
			message: 'Unexpected error.',
			path: ['delegation'],
			locations: undefined,
			extensions: { code: 'INTERNAL_SERVER_ERROR' }
		});
		expect(isPlain(formatted)).toBe(true);
	});

	it('keeps an error a resolver raised as a GraphQLError, wrapped by the executor', () => {
		const raised = new GraphQLError('Not found', { extensions: { code: 'NOT_FOUND' } });
		const wrapped = new GraphQLError(raised.message, { originalError: raised });

		expect(formatError(wrapped).message).toBe('Not found');
	});
});
