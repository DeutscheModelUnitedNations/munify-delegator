/**
 * Fixtures for the groups of committees and custom roles (e2e/authorization/group-chats.spec.ts,
 * e2e/messages/group-chats.spec.ts).
 *
 * A conference of its own in PREPARATION with the roles released and the groups open
 * (`groupChatsEnabled`). GV and SR have one seat per delegation:
 * - Germany: Anna Alpha (GV) and Bert Beta (SR)
 * - France: Carla Gamma (GV)
 * - the press, a custom role: Pia Presse holds it; Quirin Quelle applied and holds no role
 * - the team: a chair of GV, a consultant of SR, Lena Leitung looking after the press
 *   (`ROLE_SUPPORT`), participant care, project management, and a plain member without any
 *   function
 *
 * Every run starts without chats and mutes, and with the groups open. Each spec file has a
 * conference of its own (`groupChatsFixture`), so the rules and the flows run side by side.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference, upsertGvAndSr, upsertSeatedDelegations } from './conference';
import { seedTermsAcceptances } from './messagingTerms';
import { resetTeam } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

const NATIONS = { deu: 'de', fra: 'fr' };

/** One of the two conferences: `ui` for e2e/messages/, `auth` for e2e/authorization/. */
export function groupChatsFixture(tag: 'ui' | 'auth') {
	const key = tag === 'ui' ? 'grp' : 'gra';
	const user = (name: string) => `e2e-${key}-${name}`;
	const team = {
		chair: { id: user('chair'), given: 'Chris', family: 'Chair', role: 'MEMBER' },
		consultant: { id: user('consultant'), given: 'Rita', family: 'Rat', role: 'MEMBER' },
		support: { id: user('support'), given: 'Lena', family: 'Leitung', role: 'MEMBER' },
		care: { id: user('care'), given: 'Cora', family: 'Care', role: 'PARTICIPANT_CARE' },
		management: { id: user('pm'), given: 'Petra', family: 'Projekt', role: 'PROJECT_MANAGEMENT' },
		member: { id: user('member'), given: 'Milan', family: 'Mitglied', role: 'MEMBER' }
	} as const;
	const delegates = {
		anna: { id: user('anna'), given: 'Anna', family: 'Alpha' },
		bert: { id: user('bert'), given: 'Bert', family: 'Beta' },
		carla: { id: user('carla'), given: 'Carla', family: 'Gamma' }
	} as const;
	const singles = {
		pia: { id: user('pia'), given: 'Pia', family: 'Presse' },
		quirin: { id: user('quirin'), given: 'Quirin', family: 'Quelle' }
	} as const;
	const people = [...Object.values(team), ...Object.values(delegates), ...Object.values(singles)];
	return {
		key,
		conferenceId: `e2e00000conference0000${key}`,
		title: tag === 'ui' ? 'E2E Groups Conference' : 'E2E Groups Rules Conference',
		gvId: `e2e00000${key}committee00001`,
		srId: `e2e00000${key}committee00002`,
		/** The committees' abbreviations, as the chats show them */
		gv: tag === 'ui' ? 'GRGV' : 'GAGV',
		sr: tag === 'ui' ? 'GRSR' : 'GASR',
		pressRoleId: `e2e00000${key}role0000000001`,
		pressName: tag === 'ui' ? 'E2E Presse' : 'E2E Pressestelle',
		germanyDelegationId: `e2e00000${key}delegation0001`,
		franceDelegationId: `e2e00000${key}delegation0002`,
		team,
		delegates,
		singles,
		/** The `conferenceParticipant` id of a person of the fixture, as the chats name them. */
		participantId: (userId: string) => `e2e-${key}-participant-${userId}`,
		/** The name a person signs in with (the login refreshes it from the claims). */
		claims: (userId: string) => {
			const person = people.find((candidate) => candidate.id === userId);
			return person ? { given_name: person.given, family_name: person.family } : {};
		}
	};
}

type Fixture = ReturnType<typeof groupChatsFixture>;

export async function seedGroupChats(db: NodePgDatabase) {
	await seedGroupChatsConference(db, groupChatsFixture('ui'));
	await seedGroupChatsConference(db, groupChatsFixture('auth'));
}

async function seedGroupChatsConference(db: NodePgDatabase, fixture: Fixture) {
	const { conferenceId } = fixture;
	await upsertConference(db, {
		id: conferenceId,
		title: fixture.title,
		state: 'PREPARATION',
		nations: NATIONS
	});
	await db
		.update(schema.conference)
		.set({ messagingEnabled: true, groupChatsEnabled: true, assignmentReleased: true })
		.where(eq(schema.conference.id, conferenceId));
	await upsertGvAndSr(db, { fixture, nations: Object.keys(NATIONS) });

	const people = [
		...Object.values(fixture.team),
		...Object.values(fixture.delegates),
		...Object.values(fixture.singles)
	];
	await upsertUsers(
		db,
		people.map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: person.given,
			familyName: person.family,
			messageNotificationEmails: true,
			groupMessageNotificationEmails: true
		}))
	);
	const participants = [...Object.values(fixture.delegates), ...Object.values(fixture.singles)];
	await seedTermsAcceptances(db, { agreed: participants.map((person) => person.id), others: [] });

	// what a run left: chats (their messages, reads, mutes and reports go along) and functions
	await db.delete(schema.chat).where(eq(schema.chat.conferenceId, conferenceId));
	const press = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: fixture.pressRoleId,
		name: fixture.pressName,
		icon: 'newspaper'
	};
	await db
		.insert(schema.conferenceRole)
		.values(press)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: press });
	await resetTeam(db, { conferenceId, team: Object.values(fixture.team) });
	await db.insert(schema.teamFunction).values([
		{ teamMemberId: `e2e-team-${fixture.team.chair.id}`, committeeId: fixture.gvId, kind: 'CHAIR' },
		{
			teamMemberId: `e2e-team-${fixture.team.consultant.id}`,
			committeeId: fixture.srId,
			kind: 'CONSULTANT'
		},
		{
			teamMemberId: `e2e-team-${fixture.team.support.id}`,
			roleId: fixture.pressRoleId,
			kind: 'ROLE_SUPPORT'
		}
	]);

	await seedSeats(db, fixture);
}

async function participantOf(db: NodePgDatabase, fixture: Fixture, userId: string) {
	const id = fixture.participantId(userId);
	const row = { id, conferenceId: fixture.conferenceId, userId, messagingSuspended: false };
	await db
		.insert(schema.conferenceParticipant)
		.values(row)
		.onConflictDoUpdate({ target: schema.conferenceParticipant.id, set: row });
	return id;
}

async function seedSeats(db: NodePgDatabase, fixture: Fixture) {
	const { conferenceId } = fixture;
	await upsertSeatedDelegations(db, {
		conferenceId,
		delegations: [
			[fixture.germanyDelegationId, 'deu'],
			[fixture.franceDelegationId, 'fra']
		]
	});
	const { anna, bert, carla } = fixture.delegates;
	for (const [delegate, delegationId, assignedCommitteeId, isHeadDelegate] of [
		[anna, fixture.germanyDelegationId, fixture.gvId, true],
		[bert, fixture.germanyDelegationId, fixture.srId, false],
		[carla, fixture.franceDelegationId, fixture.gvId, true]
	] as const) {
		const member = {
			...makeSeedDelegationMember({
				delegationId,
				conferenceParticipantId: await participantOf(db, fixture, delegate.id),
				assignedCommitteeId,
				isHeadDelegate
			}),
			id: `e2e-${fixture.key}-member-${delegate.id}`
		};
		await db
			.insert(schema.delegationMember)
			.values(member)
			.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
	}
	for (const [person, assignedRoleId] of [
		[fixture.singles.pia, fixture.pressRoleId],
		[fixture.singles.quirin, null]
	] as const) {
		const single = {
			...makeSeedSingleParticipant({
				conferenceParticipantId: await participantOf(db, fixture, person.id),
				applied: true,
				assignedRoleId
			}),
			id: `e2e-${fixture.key}-single-${person.id}`
		};
		await db
			.insert(schema.singleParticipant)
			.values(single)
			.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });
	}
}
