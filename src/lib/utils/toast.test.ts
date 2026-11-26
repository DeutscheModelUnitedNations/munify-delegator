import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { errorToastMessage, genericPromiseToastMessages } from './toast';

const failed = (message: string, extensions?: Record<string, unknown>) =>
	new CombinedError({ graphQLErrors: [new GraphQLError(message, { extensions })] });

describe('errorToastMessage', () => {
	it("shows the API's translated message of a coded error, without the prefix", () => {
		const err = failed('Der Gremientext konnte nicht als PDF erzeugt werden.', {
			code: 'INVALID_INPUT'
		});
		expect(err.message).toMatch(/^\[GraphQL\]/);
		expect(errorToastMessage(err)).toBe('Der Gremientext konnte nicht als PDF erzeugt werden.');
	});

	it('shows the generic message for an unexpected error or a network failure', () => {
		expect(errorToastMessage(failed('relation "x" does not exist'))).toBe(m.genericToastError());
		expect(
			errorToastMessage(new CombinedError({ networkError: new TypeError('Failed to fetch') }))
		).toBe(m.genericToastError());
	});

	it("shows the client's own errors as they are, anything else generically", () => {
		expect(errorToastMessage(new Error('Hochladen fehlgeschlagen'))).toBe(
			'Hochladen fehlgeschlagen'
		);
		expect(errorToastMessage(new Error(''))).toBe(m.genericToastError());
		expect(errorToastMessage('nope')).toBe(m.genericToastError());
	});

	it('is what the generic promise toast shows', () => {
		expect(genericPromiseToastMessages.error).toBe(errorToastMessage);
	});
});
