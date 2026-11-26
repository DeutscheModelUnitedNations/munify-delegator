import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	accessCardId: 'card' as string | null,
	/** Whether the person has a part in the conference, and a row about it. */
	found: true,
	hasRow: true,
	/** The session looked up in; none the conference has not. */
	session: { mode: 'BADGE', endedAt: null as Date | null } as
		{ mode: string; endedAt: Date | null } | undefined
}));

vi.mock('#api/db/db', () => ({
	db: {
		query: {
			user: {
				findFirst: async () =>
					state.found
						? {
								id: 'ada',
								givenName: 'Ada',
								familyName: 'Lovelace',
								birthday: null,
								delegationMemberships: [],
								singleParticipant: [{ assignedRole: null }],
								conferenceSupervisor: [],
								teamMember: [],
								waitingListEntry: []
							}
						: undefined
			},
			conferenceParticipant: {
				findFirst: async () =>
					state.hasRow
						? {
								id: 'participant',
								accessCardId: state.accessCardId,
								didAttend: false,
								paymentStatus: 'DONE',
								termsAndConditions: 'DONE',
								guardianConsent: 'DONE'
							}
						: undefined
			},
			attendanceSession: {
				findFirst: async () => state.session && { ...state.session, surveyOptions: [] }
			},
			attendanceEntry: { findFirst: async () => undefined }
		}
	}
}));

const { lookupScan } = await import('./scanLookupService');

const lookup = (sessionId?: string) =>
	lookupScan({ conferenceId: 'conference', code: 'ada', sessionId });

beforeEach(() => {
	Object.assign(state, {
		accessCardId: 'card',
		found: true,
		hasRow: true,
		session: { mode: 'BADGE', endedAt: null }
	});
});

describe('lookupScan', () => {
	it('tells the card where a running session hands cards out', async () => {
		expect(await lookup('session')).toMatchObject({
			found: true,
			accessCardId: 'card',
			checkPassed: true
		});
	});

	it('tells no card without a session', async () => {
		expect((await lookup()).accessCardId).toBeNull();
	});

	it.each([
		['a session that hands out none', { mode: 'CHECK', endedAt: null }],
		['a session that ended', { mode: 'BADGE', endedAt: new Date() }],
		['a session of another conference', undefined]
	])('tells no card in %s', async (_name, session) => {
		state.session = session;
		expect((await lookup('session')).accessCardId).toBeNull();
	});

	it('tells no card the person does not carry', async () => {
		state.accessCardId = null;
		expect((await lookup('session')).accessCardId).toBeNull();
	});

	it('tells no card of a person without a participant row', async () => {
		state.hasRow = false;
		expect((await lookup('session')).accessCardId).toBeNull();
	});

	it('finds nothing for somebody with no part in the conference', async () => {
		state.found = false;
		expect(await lookup('session')).toMatchObject({ found: false, accessCardId: null });
	});
});
