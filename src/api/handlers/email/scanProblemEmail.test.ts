import { beforeEach, describe, expect, test, vi } from 'vitest';
import { sendScanProblemEmail } from './scanProblemEmail';

const mocks = vi.hoisted(() => ({
	findFirst: vi.fn(),
	preferencesOfMembers: vi.fn(),
	wantsNotification: vi.fn(),
	sendByHand: vi.fn()
}));
vi.mock('#api/db/db', () => ({ db: { query: { teamMember: { findFirst: mocks.findFirst } } } }));
vi.mock('#api/handlers/notification/notificationStore', () => mocks);
vi.mock('#lib/helpers/teamNotifications', () => mocks);
vi.mock('./emailDelivery', () => ({
	loadWording: vi.fn(),
	renderNoticeEmail: vi.fn(),
	sendByHand: mocks.sendByHand
}));

const send = () =>
	sendScanProblemEmail({
		teamMemberId: 'member',
		notice: { conferenceId: 'c', conferenceTitle: 'MUN', scanner: 'Copier', problems: () => [] },
		origin: undefined
	});

beforeEach(() => {
	vi.resetAllMocks();
	mocks.findFirst.mockResolvedValue({
		id: 'member',
		user: { id: 'ada', email: 'ada@example.org' }
	});
	mocks.preferencesOfMembers.mockResolvedValue(new Map());
	mocks.wantsNotification.mockReturnValue(true);
});

describe('sendScanProblemEmail', () => {
	test('says whether it went out', async () => {
		mocks.sendByHand.mockResolvedValueOnce(undefined);
		expect(await send()).toBe('sent');
		// an unreachable mail server gives no reason
		for (const reason of ['', 'no such mailbox']) {
			mocks.sendByHand.mockResolvedValueOnce(reason);
			expect(await send()).toBe('failed');
		}
	});

	test('sends nothing to somebody who does not want it, or left', async () => {
		mocks.wantsNotification.mockReturnValueOnce(false);
		expect(await send()).toBe('unwanted');
		mocks.findFirst.mockResolvedValueOnce(undefined);
		expect(await send()).toBe('unwanted');
		expect(mocks.sendByHand).not.toHaveBeenCalled();
	});
});
