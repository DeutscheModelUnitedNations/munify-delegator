import { describe, expect, it, vi } from 'vitest';
import { chasePresenceSchema } from '#lib/schemata/chasePresence';

vi.mock('$app/env/private', () => ({}));
vi.mock('$app/env/public', () => ({ PUBLIC_OIDC_AUTHORITY: 'https://idp.example' }));

const { presenceFromChase } = await import('./presenceMirror');
type ChasePresenceUser = import('./presenceMirror').ChasePresenceUser;

const event = (present: boolean) => ({
	id: `e-${present}`,
	committeeId: 'ga',
	present,
	type: 'ROLL_CALL',
	timestamp: new Date('2027-03-02T09:00:00Z')
});

const users: ChasePresenceUser[] = [
	{
		conferenceUserType: 'DELEGATE',
		userEmail: 'anna@example.org',
		committeeMember: {
			committeeId: 'ga',
			representation: { id: 'role-de', type: 'DELEGATION', alpha2Code: 'de', alpha3Code: 'deu' }
		},
		presenceEvents: [event(true), event(false)]
	},
	{
		conferenceUserType: 'NON_STATE_ACTOR',
		userEmail: 'nora@example.org',
		conferenceMember: {
			representation: { id: 'role-amnesty', type: 'NSA', name: 'Amnesty', icon: 'bird' }
		},
		presenceEvents: [event(true)]
	},
	{ conferenceUserType: 'ADMIN', userEmail: 'pm@example.org', presenceEvents: [] },
	{ conferenceUserType: 'SPECTATOR', userEmail: 'press@example.org', presenceEvents: [] }
];

describe('presenceFromChase', () => {
	const presence = presenceFromChase({
		conferenceId: 'conf',
		users,
		now: new Date('2027-03-03T12:00:00Z')
	});

	it('is what an uploaded presence export would be', () => {
		expect(chasePresenceSchema.safeParse(presence).success).toBe(true);
		expect(presence).toMatchObject({
			conferenceId: 'conf',
			exportedAt: '2027-03-03T12:00:00.000Z'
		});
	});

	it('keeps delegates and non-state actors only', () => {
		expect(presence.participants.map((p) => [p.email, p.kind])).toEqual([
			['anna@example.org', 'DELEGATE'],
			['nora@example.org', 'NSA']
		]);
	});

	it("takes a delegate's committee and seat, and an NSA's actor", () => {
		expect(presence.participants[0]).toMatchObject({
			committeeId: 'ga',
			representation: { id: 'role-de', alpha3Code: 'deu', name: null }
		});
		expect(presence.participants[1]).toMatchObject({
			committeeId: null,
			representation: { id: 'role-amnesty', name: 'Amnesty' }
		});
	});

	it('passes the raw records on, for the import page to score', () => {
		expect(presence.participants[0].events).toEqual([
			{
				id: 'e-true',
				committeeId: 'ga',
				present: true,
				type: 'ROLL_CALL',
				timestamp: '2027-03-02T09:00:00.000Z'
			},
			{
				id: 'e-false',
				committeeId: 'ga',
				present: false,
				type: 'ROLL_CALL',
				timestamp: '2027-03-02T09:00:00.000Z'
			}
		]);
	});

	it("puts each person's events in time order", () => {
		const later = { ...event(false), id: 'later', timestamp: new Date('2027-03-02T10:00:00Z') };
		const earlier = { ...event(true), id: 'earlier', timestamp: new Date('2027-03-02T08:00:00Z') };
		const [anna] = presenceFromChase({
			conferenceId: 'conf',
			users: [{ ...users[0], presenceEvents: [later, earlier] }],
			now: new Date()
		}).participants;
		expect(anna.events.map((e) => e.id)).toEqual(['earlier', 'later']);
	});
});
