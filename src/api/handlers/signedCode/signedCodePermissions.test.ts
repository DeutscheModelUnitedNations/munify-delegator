import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ApiContext } from '#api/rumble';
import { assertCanIssueCodeFor, supervisesHolder } from './signedCodePermissions';

const { callerFacts, hasTeamPermission } = vi.hoisted(() => ({
	callerFacts: vi.fn(),
	hasTeamPermission: vi.fn()
}));
vi.mock('#api/services/authHelper/callerFacts', () => ({ callerFacts }));
vi.mock('#api/services/authHelper/rules', () => ({ hasTeamPermission }));
vi.mock('#api/handlers/conference/conferencePermissions', () => ({
	assertCanSetDocumentLayout: vi.fn()
}));

const student = {
	participantId: 'p1',
	userId: 'ada',
	conferenceId: 'mun-sh',
	delegationMemberId: 'm1',
	delegationId: 'd1',
	singleParticipantId: null
};

// TYPE-SAFETY-EXCEPTION: the check reads only who is logged in; a whole context is not needed
const ctxOf = (sub: string) => ({ mustBeLoggedIn: () => ({ sub }) }) as unknown as ApiContext;

const issue = ({ caller, userId }: { caller: string; userId: string }) =>
	assertCanIssueCodeFor({ ctx: ctxOf(caller), conferenceId: 'mun-sh', userId, message: 'no' });

beforeEach(() => {
	callerFacts.mockResolvedValue({ supervised: [] });
	hasTeamPermission.mockResolvedValue(false);
});

describe('supervisesHolder', () => {
	test('is true for a student of the caller in that conference only', () => {
		const facts = { supervised: [student] };
		expect(supervisesHolder({ facts, conferenceId: 'mun-sh', userId: 'ada' })).toBe(true);
		expect(supervisesHolder({ facts, conferenceId: 'mun-sh', userId: 'grace' })).toBe(false);
		expect(supervisesHolder({ facts, conferenceId: 'munbw', userId: 'ada' })).toBe(false);
	});
});

describe('assertCanIssueCodeFor', () => {
	test('hands people their own codes', async () => {
		await expect(issue({ caller: 'ada', userId: 'ada' })).resolves.toBeUndefined();
	});

	test("hands a supervisor their students' codes (application documents, certificates)", async () => {
		callerFacts.mockResolvedValue({ supervised: [student] });
		await expect(issue({ caller: 'teacher', userId: 'ada' })).resolves.toBeUndefined();
	});

	test('hands participant care anybody’s codes', async () => {
		hasTeamPermission.mockResolvedValue(true);
		await expect(issue({ caller: 'care', userId: 'ada' })).resolves.toBeUndefined();
	});

	test('refuses everybody else', async () => {
		await expect(issue({ caller: 'grace', userId: 'ada' })).rejects.toThrow('no');
	});
});
