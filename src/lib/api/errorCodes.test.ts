import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { conflictMessageOf, errorCodeOf, hasErrorCode } from './errorCodes';

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
