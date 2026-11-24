import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ScanProblem } from '#lib/paperScan/intake/problems';
import { tellScanProblems } from './scanProblemNotice';

const { findFirst, sendScanProblemEmail, tellScanProblemOnSlack } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	sendScanProblemEmail: vi.fn(),
	tellScanProblemOnSlack: vi.fn()
}));
vi.mock('$app/env/private', () => ({ APP_URL: undefined, LOG_LEVEL: 'silent', NODE_ENV: 'test' }));
vi.mock('#api/db/db', () => ({ db: { query: { conference: { findFirst } } } }));
vi.mock('#api/handlers/email/scanProblemEmail', () => ({ sendScanProblemEmail }));
vi.mock('#api/handlers/notification/slackNotifications', () => ({ tellScanProblemOnSlack }));

const conferences = ['a', 'b', 'c'].map((id) => ({ conferenceId: id, teamMemberId: `in-${id}` }));
const problem = ({ page, of }: { page: number; of?: string }): ScanProblem => ({
	file: 's.pdf',
	pages: [page],
	reason: 'otherCode',
	conferenceId: of
});
const tell = (...problems: ScanProblem[]) =>
	tellScanProblems({ problems, scanner: 'Copier', conferences });

/** Who was mailed, and about how many problems each. */
const mailed = () =>
	sendScanProblemEmail.mock.calls.map(([{ teamMemberId, notice }]) => [
		teamMemberId,
		notice.problems().length
	]);

beforeEach(() => {
	vi.resetAllMocks();
	findFirst.mockResolvedValue({ title: 'MUN' });
	sendScanProblemEmail.mockResolvedValue('sent');
	tellScanProblemOnSlack.mockResolvedValue(false);
});

describe('tellScanProblems', () => {
	test('tells of each page in its conference, and once of what is of none', async () => {
		await tell(
			problem({ page: 1, of: 'b' }),
			problem({ page: 2, of: 'c' }),
			problem({ page: 3 }),
			problem({ page: 4, of: 'c' })
		);
		expect(mailed()).toEqual([
			['in-b', 2],
			['in-c', 2]
		]);
	});

	test('tells of what is of no conference in the first where it is wanted', async () => {
		sendScanProblemEmail.mockResolvedValueOnce('unwanted');
		await tell(problem({ page: 1 }));
		expect(mailed()).toEqual([
			['in-a', 1],
			['in-b', 1]
		]);
	});

	test('counts a page of a conference they are not in any more as of none', async () => {
		await tell(problem({ page: 1, of: 'left' }));
		expect(mailed()).toEqual([['in-a', 1]]);
	});

	test('is done when they want to hear nothing, or Slack reached them though the mail failed', async () => {
		sendScanProblemEmail.mockResolvedValue('unwanted');
		await expect(tell(problem({ page: 1, of: 'a' }))).resolves.toBeUndefined();
		sendScanProblemEmail.mockResolvedValue('failed');
		tellScanProblemOnSlack.mockResolvedValue(true);
		await expect(tell(problem({ page: 1, of: 'a' }))).resolves.toBeUndefined();
	});

	test('throws when a mail failed and nothing else told them', async () => {
		sendScanProblemEmail.mockResolvedValue('failed');
		await expect(tell(problem({ page: 1, of: 'b' }))).rejects.toThrow();
		// it goes to no other conference: it is tried again
		sendScanProblemEmail.mockClear();
		await expect(tell(problem({ page: 1 }))).rejects.toThrow();
		expect(mailed()).toEqual([['in-a', 1]]);
	});
});
