import { beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

const { runInvitationAction } = await import('./invitationActions');

beforeEach(() => {
	toastError.mockReset();
});

describe('runInvitationAction', () => {
	test('calls onSuccess with the result on success', async () => {
		const onSuccess = vi.fn();
		const result = { success: true, message: null, token: 't' };
		await runInvitationAction({
			mutation: () => Promise.resolve(result),
			onSuccess,
			failureLog: 'log'
		});
		expect(onSuccess).toHaveBeenCalledWith(result);
		expect(toastError).not.toHaveBeenCalled();
	});

	test('toasts the reported error, or a generic one', async () => {
		const onSuccess = vi.fn();
		await runInvitationAction({
			mutation: () => Promise.resolve({ success: false, message: 'expired' }),
			onSuccess,
			failureLog: 'log'
		});
		expect(toastError).toHaveBeenLastCalledWith('expired');
		await runInvitationAction({
			mutation: () => Promise.resolve({ success: false, message: null }),
			onSuccess,
			failureLog: 'log'
		});
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(onSuccess).not.toHaveBeenCalled();
	});

	test('a thrown error, also from onSuccess, is toasted and logged', async () => {
		const logError = vi.spyOn(logger, 'error').mockImplementation(() => {});
		const failure = new Error('network');
		await runInvitationAction({
			mutation: () => Promise.reject(failure),
			onSuccess: vi.fn(),
			failureLog: 'Failed'
		});
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(logError).toHaveBeenLastCalledWith('Failed', failure);

		await runInvitationAction({
			mutation: () => Promise.resolve({ success: true }),
			onSuccess: () => Promise.reject(failure),
			failureLog: 'Copy failed'
		});
		expect(logError).toHaveBeenLastCalledWith('Copy failed', failure);
		logError.mockRestore();
	});
});
