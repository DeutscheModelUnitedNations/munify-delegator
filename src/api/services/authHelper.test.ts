import { describe, expect, test, vi } from 'vitest';
import type { Context } from '$api/context';

vi.mock('$api/db/db', () => ({ db: {} }));

const {
	isManagedUser,
	isOwnUser,
	isParticipantOfConference,
	isTeamMemberOf,
	isTeamMemberOfConference,
	participatesIn,
	systemAdmin,
	where
} = await import('./authHelper');

/** Just enough of a request context for the filter builders, which read only these two parts. */
function contextFor(sub: string | undefined, roles: string[] = []): Context {
	const ctx: Pick<Context, 'hasRole' | 'oidc'> = {
		hasRole: (role) => roles.includes(role),
		oidc: {
			user: sub
				? {
						sub,
						email: `${sub}@example.org`,
						OIDCRoleNames: [],
						hasRole: () => false
					}
				: undefined,
			claims: {}
		}
	};
	// TYPE-SAFETY-EXCEPTION: the filter builders never touch the rest of the context (the request
	// event, the URL), and building a real RequestEvent here would test SvelteKit, not them.
	return ctx as Context;
}

const anonymous = contextFor(undefined);
const user = contextFor('u1');
const admin = contextFor('a1', ['admin']);

describe('filters grant nothing to anonymous requests', () => {
	test.each([
		['isTeamMemberOf', () => isTeamMemberOf(anonymous)],
		['isTeamMemberOfConference', () => isTeamMemberOfConference(anonymous)],
		['isOwnUser', () => isOwnUser(anonymous)],
		['isParticipantOfConference', () => isParticipantOfConference(anonymous)],
		['isManagedUser', () => isManagedUser(anonymous)]
	])('%s', (_name, filter) => {
		expect(filter()).toBeUndefined();
	});

	test('systemAdmin', () => {
		expect(systemAdmin(anonymous)).toBeUndefined();
		expect(systemAdmin(user)).toBeUndefined();
		expect(systemAdmin(admin)).toBe('allow');
	});
});

describe('team filters', () => {
	test('match the caller on the team, with or without a role restriction', () => {
		expect(isTeamMemberOf(user)).toEqual({ teamMembers: { user: { id: 'u1' } } });
		expect(isTeamMemberOf(user, ['REVIEWER'])).toEqual({
			teamMembers: { user: { id: 'u1' }, role: { in: ['REVIEWER'] } }
		});
		expect(isTeamMemberOfConference(user, ['REVIEWER'])).toEqual({
			conference: { teamMembers: { user: { id: 'u1' }, role: { in: ['REVIEWER'] } } }
		});
	});

	test('let a system admin through every team, on or off it', () => {
		expect(isTeamMemberOf(admin, ['PROJECT_MANAGEMENT'])).toEqual({});
		expect(isTeamMemberOfConference(admin)).toEqual({ conference: {} });
		expect(isManagedUser(admin)).toEqual({});
	});
});

describe('isOwnUser', () => {
	test('is the caller only - an admin gets the wildcard from systemAdmin, not from here', () => {
		expect(isOwnUser(user)).toEqual({ user: { id: 'u1' } });
		expect(isOwnUser(admin)).toEqual({ user: { id: 'a1' } });
	});
});

describe('isManagedUser', () => {
	test('covers participants, waiting list and team of the conferences the caller cares for', () => {
		const conference = {
			teamMembers: {
				user: { id: 'u1' },
				role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
			}
		};
		expect(isManagedUser(user)).toEqual({
			OR: [
				...participatesIn(conference).OR,
				{ waitingListEntry: { conference } },
				{ teamMember: { conference } }
			]
		});
	});
});

describe('where', () => {
	test('wraps a filter for an ability rule, and grants nothing without one', () => {
		expect(where({ id: 'x' })).toEqual({ where: { id: 'x' } });
		expect(where(undefined)).toBeUndefined();
	});
});
