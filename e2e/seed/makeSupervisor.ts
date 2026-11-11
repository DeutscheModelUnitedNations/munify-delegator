/**
 * Fixtures for turning a delegate into a supervisor (e2e/team/make-supervisor.spec.ts).
 *
 * A conference of its own, because the spec turns Olga Old into the supervisor of her delegation.
 * Every run resets it to: one delegation of Olga (head delegate, forty years old, too old for a
 * delegation), Yara and Yannick Young (seventeen), and Olga supervised by Sam Supervisor.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';
import { upsertConference } from './conference';

export const E2E_MAKE_SUPERVISOR_CONFERENCE_ID = 'e2e00000conference0000012';
export const E2E_MAKE_SUPERVISOR_CARE_ID = 'e2e-makesup-care';
const DELEGATION_ID = 'e2e00000makesupdelegation1';

const yearsAgo = (years: number) => new Date(Date.UTC(new Date().getFullYear() - years, 0, 1));

export const E2E_MAKE_SUPERVISOR_PEOPLE = {
	olga: {
		id: 'e2e-makesup-olga',
		memberId: 'e2e00000makesupmember0001',
		given: 'Olga',
		family: 'Old'
	},
	yara: {
		id: 'e2e-makesup-yara',
		memberId: 'e2e00000makesupmember0002',
		given: 'Yara',
		family: 'Young'
	},
	yannick: {
		id: 'e2e-makesup-yannick',
		memberId: 'e2e00000makesupmember0003',
		given: 'Yannick',
		family: 'Young'
	},
	sam: { id: 'e2e-makesup-sam', given: 'Sam', family: 'Supervisor' }
} as const;

export async function seedMakeSupervisor(db: NodePgDatabase) {
	const conferenceId = E2E_MAKE_SUPERVISOR_CONFERENCE_ID;
	await upsertConference(db, {
		id: conferenceId,
		title: 'E2E Make Supervisor Conference',
		state: 'PARTICIPANT_REGISTRATION',
		nations: {}
	});
	await db
		.update(schema.conference)
		.set({ participantMinAge: 13, participantMaxAge: 21, supervisorMinAge: 21 })
		.where(eq(schema.conference.id, conferenceId));

	const { olga, yara, yannick, sam } = E2E_MAKE_SUPERVISOR_PEOPLE;
	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_MAKE_SUPERVISOR_CARE_ID,
			givenName: 'E2E',
			familyName: 'MakeSupCare'
		},
		...[olga, sam].map((x) => ({
			...makeSeedUser(),
			id: x.id,
			givenName: x.given,
			familyName: x.family,
			birthday: yearsAgo(40)
		})),
		...[yara, yannick].map((x) => ({
			...makeSeedUser(),
			id: x.id,
			givenName: x.given,
			familyName: x.family,
			birthday: yearsAgo(17)
		}))
	]);
	await upsertTeamMember(db, conferenceId, E2E_MAKE_SUPERVISOR_CARE_ID, 'PARTICIPANT_CARE');

	// start from scratch: the spec makes Olga a supervisor; members and supervisions go along
	const participants = db
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(eq(schema.conferenceParticipant.conferenceId, conferenceId));
	await db
		.delete(schema.conferenceSupervisor)
		.where(inArray(schema.conferenceSupervisor.conferenceParticipantId, participants));
	await db.delete(schema.delegation).where(eq(schema.delegation.conferenceId, conferenceId));

	await db
		.insert(schema.delegation)
		.values({ ...makeSeedDelegation({ conferenceId, applied: false }), id: DELEGATION_ID });
	for (const [delegate, isHeadDelegate] of [
		[olga, true],
		[yara, false],
		[yannick, false]
	] as const) {
		await db.insert(schema.delegationMember).values({
			...makeSeedDelegationMember({
				delegationId: DELEGATION_ID,
				conferenceParticipantId: await upsertParticipant(db, conferenceId, delegate.id),
				assignedCommitteeId: null,
				isHeadDelegate
			}),
			id: delegate.memberId
		});
	}

	const [supervisor] = await db
		.insert(schema.conferenceSupervisor)
		.values({
			conferenceParticipantId: await upsertParticipant(db, conferenceId, sam.id),
			plansOwnAttendenceAtConference: true,
			connectionCode: 'MKSUPSAM'
		})
		.returning({ id: schema.conferenceSupervisor.id });
	await db
		.insert(schema.supervision)
		.values({ a: supervisor.id, b: await upsertParticipant(db, conferenceId, olga.id) });
}
