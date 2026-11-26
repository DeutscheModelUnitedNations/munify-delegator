import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { apiErrorMessageOf, conflictMessageOf, errorCodeOf, hasErrorCode } from './errorCodes';

const failed = (extensions?: Record<string, unknown>) =>
	new CombinedError({ graphQLErrors: [new GraphQLError('Text', { extensions })] });

describe('errorCodeOf', () => {
	it('reads the code of a failed operation', () => {
		expect(errorCodeOf(failed({ code: 'NOT_FOUND' }))).toBe('NOT_FOUND');
	});

	it('takes the first known code when several errors came back', () => {
		const err = new CombinedError({
			graphQLErrors: [
				new GraphQLError('a'),
				new GraphQLError('b', { extensions: { code: 'FORBIDDEN' } })
			]
		});
		expect(errorCodeOf(err)).toBe('FORBIDDEN');
	});

	it('ignores codes the app does not define, and anything that is not a failed operation', () => {
		expect(errorCodeOf(failed({ code: 'INTERNAL_SERVER_ERROR' }))).toBeUndefined();
		expect(errorCodeOf(failed())).toBeUndefined();
		expect(errorCodeOf(new Error('NOT_FOUND'))).toBeUndefined();
		expect(errorCodeOf(undefined)).toBeUndefined();
	});
});

describe('hasErrorCode', () => {
	it('matches one code', () => {
		expect(hasErrorCode({ err: failed({ code: 'CONFLICT' }), code: 'CONFLICT' })).toBe(true);
		expect(hasErrorCode({ err: failed({ code: 'CONFLICT' }), code: 'FORBIDDEN' })).toBe(false);
	});
});

describe('conflictMessageOf', () => {
	it('answers the message of a refusal of the current state', () => {
		expect(conflictMessageOf(failed({ code: 'CONFLICT' }))).toBe('Text');
	});

	it('answers nothing for any other failure', () => {
		expect(conflictMessageOf(failed({ code: 'FORBIDDEN' }))).toBeUndefined();
		expect(conflictMessageOf(new Error('CONFLICT'))).toBeUndefined();
	});
});

describe('apiErrorMessageOf', () => {
	it('answers the message of any error the API gave a code, without the "[GraphQL]" prefix', () => {
		expect(apiErrorMessageOf(failed({ code: 'INVALID_INPUT' }))).toBe('Text');
		expect(apiErrorMessageOf(failed({ code: 'FORBIDDEN' }))).toBe('Text');
	});

	it('takes the message of the error that carries the code', () => {
		const err = new CombinedError({
			graphQLErrors: [
				new GraphQLError('Unexpected error.'),
				new GraphQLError('Gremientext', { extensions: { code: 'INVALID_INPUT' } })
			]
		});
		expect(apiErrorMessageOf(err)).toBe('Gremientext');
	});

	it('answers nothing for an unexpected error, a network failure or anything else', () => {
		expect(apiErrorMessageOf(failed())).toBeUndefined();
		expect(apiErrorMessageOf(failed({ code: 'INTERNAL_SERVER_ERROR' }))).toBeUndefined();
		expect(
			apiErrorMessageOf(new CombinedError({ networkError: new TypeError('Failed to fetch') }))
		).toBeUndefined();
		expect(apiErrorMessageOf(new Error('Text'))).toBeUndefined();
	});
});
