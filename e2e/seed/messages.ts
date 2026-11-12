/**
 * Fixtures for the chats (e2e/messages/, e2e/authorization/messages.spec.ts).
 *
 * A conference of its own in PREPARATION with messaging switched on and the roles released. GV
 * and SR have one seat per delegation:
 * - Germany: Anna Alpha (head delegate, GV, author of a submitted position paper) and Bert Beta (SR)
 * - France: Carla Gamma (head delegate, GV) and Dora Delta (SR)
 * - a supervisor, who takes no part in the chats
 * - the team: participant care, a chair of GV (team role MEMBER), a reviewer advising GV
 *   (CONSULTANT), project management, and a plain member without any function
 *
 * Every run starts without chats, blocks, reports and suspensions. There are two such conferences
 * with people of their own (`messagesFixture`): the flows and the authorization rules run side by
 * side, and each counts the chats it finds.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertParticipant } from './participant';
import { upsertNationRole } from './conferenceRole';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';
import { upsertConference, upsertSeatedCommittees } from './conference';

const NATIONS = { deu: 'de', fra: 'fr' };

/** One of the two conferences: `ui` for e2e/messages/, `auth` for e2e/authorization/messages.spec.ts. */
export function messagesFixture(tag: 'ui' | 'auth') {
	const key = tag === 'ui' ? 'msg' : 'msa';
	const user = (name: string) => `e2e-${key}-${name}`;
	const team = {
		care: { id: user('care'), given: 'Cora', family: 'Care', role: 'PARTICIPANT_CARE' },
		chair: { id: user('chair'), given: 'Chris', family: 'Chair', role: 'MEMBER' },
		reviewer: { id: user('reviewer'), given: 'Rita', family: 'Reviewer', role: 'REVIEWER' },
		management: { id: user('pm'), given: 'Petra', family: 'Projekt', role: 'PROJECT_MANAGEMENT' },
		member: { id: user('member'), given: 'Milan', family: 'Mitglied', role: 'MEMBER' }
	} as const;
	const delegates = {
		anna: {
			id: user('anna'),
			memberId: `e2e00000${key}member0000001`,
			given: 'Anna',
			family: 'Alpha'
		},
		bert: {
			id: user('bert'),
			memberId: `e2e00000${key}member0000002`,
			given: 'Bert',
			family: 'Beta'
		},
		carla: {
			id: user('carla'),
			memberId: `e2e00000${key}member0000003`,
			given: 'Carla',
			family: 'Gamma'
		},
		dora: {
			id: user('dora'),
			memberId: `e2e00000${key}member0000004`,
			given: 'Dora',
			family: 'Delta'
		}
	} as const;
	const people = [...Object.values(team), ...Object.values(delegates)];
	return {
		key,
		conferenceId: `e2e00000conference0000${key}`,
		title: tag === 'ui' ? 'E2E Messages Conference' : 'E2E Messages Rules Conference',
		gvId: `e2e00000${key}committee00001`,
		srId: `e2e00000${key}committee00002`,
		/** The committees' abbreviations, as the chats show them */
		gv: tag === 'ui' ? 'MSGV' : 'MAGV',
		sr: tag === 'ui' ? 'MSSR' : 'MASR',
		paperId: `e2e00000${key}paper000000001`,
		agendaItemId: `e2e00000${key}agendaitem0001`,
		germanyDelegationId: `e2e00000${key}delegation0001`,
		franceDelegationId: `e2e00000${key}delegation0002`,
		team,
		delegates,
		supervisorId: user('supervisor'),
		/** The `conferenceParticipant` id of a person of the fixture, as the chats name them. */
		participantId: (userId: string) => `e2e-${key}-participant-${userId}`,
		/**
		 * The name a person of the fixture signs in with: the login refreshes the account's name from
		 * the provider's claims, and the specs look for the seeded one.
		 */
		claims: (userId: string) => {
			const person = people.find((candidate) => candidate.id === userId);
			return person ? { given_name: person.given, family_name: person.family } : {};
		}
	};
}

type Fixture = ReturnType<typeof messagesFixture>;

export async function seedMessages(db: NodePgDatabase) {
	await seedMessagesConference(db, messagesFixture('ui'));
	await seedMessagesConference(db, messagesFixture('auth'));
}

async function seedMessagesConference(db: NodePgDatabase, fixture: Fixture) {
	const { id: conferenceId } = await upsertConference(db, {
		id: fixture.conferenceId,
		title: fixture.title,
		state: 'PREPARATION',
		nations: NATIONS
	});
	await db
		.update(schema.conference)
		.set({ messagingEnabled: true, assignmentReleased: true, isOpenPaperSubmission: true })
		.where(eq(schema.conference.id, conferenceId));

	await upsertSeatedCommittees(db, {
		conferenceId,
		committees: [
			{ id: fixture.gvId, name: 'Generalversammlung', abbreviation: fixture.gv },
			{ id: fixture.srId, name: 'Sicherheitsrat', abbreviation: fixture.sr }
		],
		nations: Object.keys(NATIONS)
	});

	await upsertUsers(db, [
		...[...Object.values(fixture.team), ...Object.values(fixture.delegates)].map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: person.given,
			familyName: person.family
		})),
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: fixture.supervisorId,
			givenName: 'Susi',
			familyName: 'Supervisor'
		}
	]);

	// what a run left: chats (their messages, reads and reports go along), blocks, functions
	await db.delete(schema.chat).where(eq(schema.chat.conferenceId, conferenceId));
	const teamMemberIds = Object.values(fixture.team).map((person) => `e2e-team-${person.id}`);
	await db
		.delete(schema.teamFunction)
		.where(inArray(schema.teamFunction.teamMemberId, teamMemberIds));
	for (const person of Object.values(fixture.team)) {
		await upsertTeamMember(db, conferenceId, person.id, person.role);
	}
	await db.insert(schema.teamFunction).values([
		{
			teamMemberId: `e2e-team-${fixture.team.chair.id}`,
			committeeId: fixture.gvId,
			kind: 'CHAIR'
		},
		{
			teamMemberId: `e2e-team-${fixture.team.reviewer.id}`,
			committeeId: fixture.gvId,
			kind: 'CONSULTANT'
		}
	]);

	await seedDelegations(db, fixture);
	await seedPaper(db, fixture);
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

async function seedDelegations(db: NodePgDatabase, fixture: Fixture) {
	const conferenceId = fixture.conferenceId;
	const delegations = [
		[fixture.germanyDelegationId, 'deu'],
		[fixture.franceDelegationId, 'fra']
	] as const;
	for (const [id, nation] of delegations) {
		const delegation = {
			...makeSeedDelegation({ conferenceId, applied: true }),
			id,
			assignedRoleId: await upsertNationRole(db, conferenceId, nation)
		};
		await db
			.insert(schema.delegation)
			.values(delegation)
			.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
	}

	const { anna, bert, carla, dora } = fixture.delegates;
	const members = [
		[anna, fixture.germanyDelegationId, fixture.gvId, true],
		[bert, fixture.germanyDelegationId, fixture.srId, false],
		[carla, fixture.franceDelegationId, fixture.gvId, true],
		[dora, fixture.franceDelegationId, fixture.srId, false]
	] as const;
	const participantIds: string[] = [];
	for (const [delegate, delegationId, assignedCommitteeId, isHeadDelegate] of members) {
		const conferenceParticipantId = await participantOf(db, fixture, delegate.id);
		participantIds.push(conferenceParticipantId);
		const member = {
			...makeSeedDelegationMember({
				delegationId,
				conferenceParticipantId,
				assignedCommitteeId,
				isHeadDelegate
			}),
			id: delegate.memberId
		};
		await db
			.insert(schema.delegationMember)
			.values(member)
			.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
	}
	await db
		.delete(schema.chatBlock)
		.where(inArray(schema.chatBlock.blockerParticipantId, participantIds));

	const supervisorParticipantId = await upsertParticipant(db, conferenceId, fixture.supervisorId);
	await db
		.insert(schema.conferenceSupervisor)
		.values({
			id: `e2e00000${fixture.key}supervisor0001`,
			conferenceParticipantId: supervisorParticipantId,
			plansOwnAttendenceAtConference: true,
			connectionCode: `E2E${fixture.key.toUpperCase()}SV`
		})
		.onConflictDoNothing();
}

/** Anna's submitted position paper in GV, which the team writes to her from. */
async function seedPaper(db: NodePgDatabase, fixture: Fixture) {
	const agendaItem = {
		id: fixture.agendaItemId,
		committeeId: fixture.gvId,
		title: 'E2E Klimaschutz'
	};
	await db
		.insert(schema.committeeAgendaItem)
		.values(agendaItem)
		.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: agendaItem });
	const paper = {
		id: fixture.paperId,
		type: 'POSITION_PAPER' as const,
		status: 'SUBMITTED' as const,
		authorParticipantId: fixture.participantId(fixture.delegates.anna.id),
		delegationId: fixture.germanyDelegationId,
		agendaItemId: fixture.agendaItemId,
		firstSubmittedAt: new Date(2026, 0, 15)
	};
	await db
		.insert(schema.paper)
		.values(paper)
		.onConflictDoUpdate({ target: schema.paper.id, set: paper });
	const version = {
		id: `e2e00000${fixture.key}paperversion01`,
		version: 1,
		status: 'SUBMITTED' as const,
		// stored as a JSON string, as the app does (see the draft paper in seed.ts)
		content: JSON.stringify({
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Unsere Position.' }] }]
		}),
		paperId: paper.id
	};
	await db
		.insert(schema.paperVersion)
		.values(version)
		.onConflictDoUpdate({ target: schema.paperVersion.id, set: version });
}
