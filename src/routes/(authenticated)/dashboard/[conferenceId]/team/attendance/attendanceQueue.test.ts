import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, test } from 'vitest';
import { isNetworkError, retryDelay } from './attendanceQueue';

describe('isNetworkError', () => {
	test('treats a TypeError (failed fetch) as a network error', () => {
		expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
	});

	test('recognizes a failed request wrapped by urql, but not a server answer', () => {
		expect(
			isNetworkError(new CombinedError({ networkError: new TypeError('Failed to fetch') }))
		).toBe(true);
		expect(
			isNetworkError(
				new CombinedError({ graphQLErrors: [new GraphQLError('network fetch failed')] })
			)
		).toBe(false);
	});

	test('does not read the message', () => {
		expect(isNetworkError(new Error('could not fetch'))).toBe(false);
	});

	test('treats an aborted request as a network error', () => {
		const err = new Error('The operation was aborted');
		err.name = 'AbortError';
		expect(isNetworkError(err)).toBe(true);
	});

	test('does not retry errors the server answered with, or non-errors', () => {
		expect(isNetworkError(new Error('User not found'))).toBe(false);
		expect(isNetworkError('network')).toBe(false);
		expect(isNetworkError(undefined)).toBe(false);
	});
});

describe('retryDelay', () => {
	test('doubles from one second and caps at thirty', () => {
		expect(retryDelay(1)).toBe(1000);
		expect(retryDelay(2)).toBe(2000);
		expect(retryDelay(5)).toBe(16000);
		expect(retryDelay(6)).toBe(30000);
		expect(retryDelay(20)).toBe(30000);
	});
});
