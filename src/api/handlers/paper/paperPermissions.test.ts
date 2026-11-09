import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
const { assertCanCreatePaper, paperWriteRefusal } = await import('./paperPermissions');
const { db } = await import('#api/db/db');

const nation = { assignmentReleased: true, roleKind: 'NATION' as const, assignedCommitteeId: 'GA' };
const nsa = {
	assignmentReleased: true,
	roleKind: 'NON_STATE_ACTOR' as const,
	assignedCommitteeId: null
};

type RefusalArgs = Parameters<typeof paperWriteRefusal>[0];
const refusalOf = (member: RefusalArgs['member'], paper: RefusalArgs['paper']) =>
	paperWriteRefusal({ member, paper })?.extensions.code;

describe('paperWriteRefusal', () => {
	test('a nation writes on the agenda items of its own committee only', () => {
		expect(refusalOf(nation, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'GA' })).toBe(
			undefined
		);
		expect(refusalOf(nation, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'SC' })).toBe(
			'FORBIDDEN'
		);
		expect(refusalOf(nation, { type: 'WORKING_PAPER', agendaItemCommitteeId: 'SC' })).toBe(
			'FORBIDDEN'
		);
	});

	test('a nation member without a committee writes on none', () => {
		expect(
			refusalOf(
				{ ...nation, assignedCommitteeId: null },
				{ type: 'POSITION_PAPER', agendaItemCommitteeId: 'GA' }
			)
		).toBe('FORBIDDEN');
	});

	test('a non-state actor writes on any agenda item', () => {
		expect(refusalOf(nsa, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'SC' })).toBe(undefined);
	});

	test('only non-state actors write introduction papers, and without an agenda item', () => {
		expect(refusalOf(nsa, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: null })).toBe(
			undefined
		);
		expect(refusalOf(nsa, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: 'GA' })).toBe(
			'INVALID_INPUT'
		);
		expect(refusalOf(nation, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: null })).toBe(
			'FORBIDDEN'
		);
	});

	test('any other paper needs an agenda item', () => {
		expect(refusalOf(nsa, { type: 'POSITION_PAPER', agendaItemCommitteeId: null })).toBe(
			'INVALID_INPUT'
		);
	});

	test('nothing is written before the release or without a delegation role', () => {
		const paper = { type: 'POSITION_PAPER' as const, agendaItemCommitteeId: 'GA' };
		expect(refusalOf({ ...nation, assignmentReleased: false }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nsa, assignmentReleased: false }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nation, roleKind: null }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nation, roleKind: 'CUSTOM' }, paper)).toBe('FORBIDDEN');
	});
});

describe('assertCanCreatePaper', () => {
	const ctx = { mustBeLoggedIn: () => ({ sub: 'u1' }) };
	const membership = {
		conferenceParticipantId: 'p1',
		assignedCommitteeId: 'GA',
		delegation: {
			assignedRole: { kind: 'NATION' as const },
			conference: { id: 'c1', assignmentReleased: true }
		}
	};
	/** Answers the caller's membership and the agenda item's committee, either of them missing. */
	function fakeDb({ member, agendaItem }: { member?: object; agendaItem?: object }) {
		Object.assign(db, {
			query: {
				delegationMember: { findFirst: async () => member },
				committeeAgendaItem: { findFirst: async () => agendaItem }
			}
		});
	}
	const create = (args: {
		agendaItemId?: string | null;
		type: 'POSITION_PAPER' | 'INTRODUCTION_PAPER';
	}) =>
		// TYPE-SAFETY-EXCEPTION: a context with only what the check reads
		assertCanCreatePaper({ ctx: ctx as never, args: { delegationId: 'd1', ...args } });
	const codeOf = (promise: Promise<unknown>) =>
		promise.then(
			() => undefined,
			(error: { extensions: { code: string } }) => error.extensions.code
		);

	test("writes under the caller's participant row in the delegation's conference", async () => {
		fakeDb({ member: membership, agendaItem: { committeeId: 'GA' } });
		await expect(create({ agendaItemId: 'a1', type: 'POSITION_PAPER' })).resolves.toEqual({
			authorParticipantId: 'p1',
			conferenceId: 'c1'
		});
	});

	test('refuses someone outside the delegation', async () => {
		fakeDb({});
		expect(await codeOf(create({ agendaItemId: 'a1', type: 'POSITION_PAPER' }))).toBe('FORBIDDEN');
	});

	test('refuses an agenda item of another conference, or of another committee', async () => {
		fakeDb({ member: membership });
		expect(await codeOf(create({ agendaItemId: 'a1', type: 'POSITION_PAPER' }))).toBe(
			'INVALID_INPUT'
		);
		fakeDb({ member: membership, agendaItem: { committeeId: 'SC' } });
		expect(await codeOf(create({ agendaItemId: 'a1', type: 'POSITION_PAPER' }))).toBe('FORBIDDEN');
	});

	test('takes a role that is not yet known as none', async () => {
		fakeDb({
			member: { ...membership, delegation: { ...membership.delegation, assignedRole: null } }
		});
		expect(await codeOf(create({ type: 'POSITION_PAPER' }))).toBe(
			refusalOf(
				{ ...nation, roleKind: null },
				{ type: 'POSITION_PAPER', agendaItemCommitteeId: null }
			)
		);
	});
});
