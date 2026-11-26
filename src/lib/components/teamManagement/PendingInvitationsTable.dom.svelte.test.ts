import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { m } from '#lib/paraglide/messages';

const { regenerate, toastSuccess } = vi.hoisted(() => ({
	regenerate: vi.fn(),
	toastSuccess: vi.fn()
}));
vi.mock('#lib/api/rumbleClient/client', () => ({
	client: { mutate: { regenerateTeamMemberInvitation: regenerate } }
}));
vi.mock('svelte-sonner', () => ({ toast: { success: toastSuccess, error: vi.fn() } }));
vi.mock('$app/state', () => ({ page: { url: new URL('https://delegator.test/') } }));

const { default: PendingInvitationsTable } = await import('./PendingInvitationsTable.svelte');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('PendingInvitationsTable', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show({ expiresInDays }: { expiresInDays: number }) {
		app = mount(PendingInvitationsTable, {
			target,
			props: {
				invitations: [
					{
						id: 'invitation',
						email: 'someone@delegator.test',
						role: 'MEMBER',
						expiresAt: new Date(Date.now() + expiresInDays * DAY_MS),
						userExists: false,
						invitedBy: null
					}
				]
			}
		});
		flushSync();
	}

	const resendButton = () =>
		target.querySelector<HTMLButtonElement>(`button[title="${m.resendInvitation()}"]`);

	beforeEach(() => {
		regenerate.mockReset();
		toastSuccess.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('an expired invitation has a labelled button that mails a fresh link, once at a time', async () => {
		let answer: (link: { expiresAt: Date }) => void = () => {};
		regenerate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		show({ expiresInDays: -1 });
		expect(resendButton()?.textContent).toContain(m.inviteAgain());

		resendButton()?.click();
		flushSync();
		expect(regenerate).toHaveBeenCalledWith({
			__args: { invitationId: 'invitation', sendEmail: true },
			expiresAt: true
		});
		expect(resendButton()?.disabled).toBe(true);

		answer({ expiresAt: new Date() });
		await vi.waitFor(() => expect(resendButton()?.disabled).toBe(false));
		expect(toastSuccess).toHaveBeenCalledWith(m.invitationResent());
	});

	test('an invitation still valid is only offered the icon', () => {
		show({ expiresInDays: 1 });
		expect(resendButton()).not.toBeNull();
		expect(resendButton()?.textContent).not.toContain(m.inviteAgain());
	});

	test('a failed resend can be tried again', async () => {
		regenerate.mockReturnValue(Promise.reject(new Error('network')));
		show({ expiresInDays: -1 });
		resendButton()?.click();
		flushSync();
		await vi.waitFor(() => expect(resendButton()?.disabled).toBe(false));
		expect(toastSuccess).not.toHaveBeenCalled();
	});
});
