import { beforeEach, describe, expect, test, vi } from 'vitest';
import { m } from '$lib/paraglide/messages';

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
		await runInvitationAction(() => Promise.resolve(result), onSuccess, 'log');
		expect(onSuccess).toHaveBeenCalledWith(result);
		expect(toastError).not.toHaveBeenCalled();
	});

	test('toasts the reported error, or a generic one', async () => {
		const onSuccess = vi.fn();
		await runInvitationAction(
			() => Promise.resolve({ success: false, message: 'expired' }),
			onSuccess,
			'log'
		);
		expect(toastError).toHaveBeenLastCalledWith('expired');
		await runInvitationAction(
			() => Promise.resolve({ success: false, message: null }),
			onSuccess,
			'log'
		);
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(onSuccess).not.toHaveBeenCalled();
	});

	test('a thrown error, also from onSuccess, is toasted and logged', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('network');
		await runInvitationAction(() => Promise.reject(failure), vi.fn(), 'Failed:');
		expect(toastError).toHaveBeenLastCalledWith(m.httpGenericError());
		expect(consoleError).toHaveBeenLastCalledWith('Failed:', failure);

		await runInvitationAction(
			() => Promise.resolve({ success: true }),
			() => Promise.reject(failure),
			'Copy failed:'
		);
		expect(consoleError).toHaveBeenLastCalledWith('Copy failed:', failure);
		consoleError.mockRestore();
	});
});
