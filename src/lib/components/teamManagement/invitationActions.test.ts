import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

const { runInvitationAction } = await import('./invitationActions');

const refused = (code: string) =>
	new CombinedError({
		graphQLErrors: [new GraphQLError('already used', { extensions: { code } })]
	});

beforeEach(() => {
	toastError.mockReset();
});

describe('runInvitationAction', () => {
	test('calls onSuccess with the result on success', async () => {
		const onSuccess = vi.fn();
		const result = { token: 't' };
		await runInvitationAction({
			mutation: () => Promise.resolve(result),
			onSuccess,
			failureLog: 'log'
		});
		expect(onSuccess).toHaveBeenCalledWith(result);
		expect(toastError).not.toHaveBeenCalled();
	});

	test("toasts a CONFLICT with the API's message, without logging it", async () => {
		const logError = vi.spyOn(logger, 'error').mockImplementation(() => {});
		const onSuccess = vi.fn();
		await runInvitationAction({
			mutation: () => Promise.reject(refused('CONFLICT')),
			onSuccess,
			failureLog: 'log'
		});
		expect(toastError).toHaveBeenLastCalledWith('already used');
		expect(onSuccess).not.toHaveBeenCalled();
		expect(logError).not.toHaveBeenCalled();
		logError.mockRestore();
	});

	test('any other error, also from onSuccess, is toasted generically and logged', async () => {
		const logError = vi.spyOn(logger, 'error').mockImplementation(() => {});
		const failure = new Error('network');
		await runInvitationAction({
			mutation: () => Promise.reject(failure),
			onSuccess: vi.fn(),
			failureLog: 'Failed'
		});
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(logError).toHaveBeenLastCalledWith('Failed', failure);

		const notFound = refused('NOT_FOUND');
		await runInvitationAction({
			mutation: () => Promise.reject(notFound),
			onSuccess: vi.fn(),
			failureLog: 'Gone'
		});
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(logError).toHaveBeenLastCalledWith('Gone', notFound);

		await runInvitationAction({
			mutation: () => Promise.resolve({ token: 't' }),
			onSuccess: () => Promise.reject(failure),
			failureLog: 'Copy failed'
		});
		expect(logError).toHaveBeenLastCalledWith('Copy failed', failure);
		logError.mockRestore();
	});
});
