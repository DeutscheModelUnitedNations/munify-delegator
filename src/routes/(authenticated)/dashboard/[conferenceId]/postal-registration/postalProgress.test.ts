import { beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';

const conferenceParticipants = vi.hoisted(() => vi.fn());
const user = vi.hoisted(() => vi.fn());
const impersonationStatus = vi.hoisted(() => vi.fn());
const updatePostalProgress = vi.hoisted(() => vi.fn());

vi.mock('#lib/api/rumbleClient/client', () => ({
	client: {
		query: { conferenceParticipants, user, impersonationStatus },
		mutate: { updatePostalProgress }
	}
}));

const { fetchPostalProgress, savePostalProgress } = await import('./postalProgress');

const fetchIt = () => fetchPostalProgress({ userId: 'ada', conferenceId: 'c' });

describe('fetchPostalProgress', () => {
	beforeEach(() => {
		conferenceParticipants.mockResolvedValue([
			{ postalInfoRead: true, postalConfirmedDetails: '0000000a', postalConfirmedOfAge: false }
		]);
		user.mockResolvedValue({ postalGuideCompletedAt: new Date() });
		impersonationStatus.mockResolvedValue({ isImpersonating: false });
	});

	test('goes on where they left off', async () => {
		expect(await fetchIt()).toEqual({
			read: true,
			confirmedDetails: '0000000a',
			confirmedOfAge: false,
			hintsSeen: true,
			recorded: true
		});
	});

	test('starts at the beginning, where nothing was done yet', async () => {
		conferenceParticipants.mockResolvedValue([
			{ postalInfoRead: false, postalConfirmedDetails: null, postalConfirmedOfAge: null }
		]);
		user.mockResolvedValue({ postalGuideCompletedAt: null });
		expect(await fetchIt()).toEqual({
			read: false,
			confirmedDetails: undefined,
			confirmedOfAge: undefined,
			hintsSeen: false,
			recorded: true
		});
	});

	test('keeps nothing while impersonating or without a part in the conference', async () => {
		impersonationStatus.mockResolvedValue({ isImpersonating: true });
		expect((await fetchIt()).recorded).toBe(false);
		impersonationStatus.mockResolvedValue({ isImpersonating: false });
		conferenceParticipants.mockResolvedValue([]);
		expect(await fetchIt()).toMatchObject({ recorded: false, read: false });
	});
});

describe('savePostalProgress', () => {
	test('sends only what is new', async () => {
		updatePostalProgress.mockResolvedValue({});
		await savePostalProgress({ conferenceId: 'c', progress: { infoRead: true } });
		expect(updatePostalProgress.mock.calls[0][0].__args).toEqual({
			conferenceId: 'c',
			infoRead: true
		});
	});

	test('failing keeps nobody from going on', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
		updatePostalProgress.mockRejectedValue(new Error('offline'));
		await savePostalProgress({ conferenceId: 'c', progress: { infoRead: true } });
		expect(warn).toHaveBeenCalledOnce();
	});
});
