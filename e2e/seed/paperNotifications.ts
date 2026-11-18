/**
 * Fixtures for telling a committee of its submitted papers
 * (e2e/papers/committee-notification.spec.ts).
 *
 * A conference of its own in PREPARATION, its assignment released and paper submission open, with
 * a Generalversammlung and a Sicherheitsrat, an agenda item in each, and Germany's delegation
 * (Paula Author, seated in the GV, and Sven Rat, in the SR). The team:
 * - Pia Chair (Reviewer), chair of the GV, and Pit Berater (Content Lead), its consultant: told
 * - Pam Member (Member), chair of the GV too: her role may not read papers, so not told
 * - Per Sicherheit (Reviewer), chair of the SR: another committee, not told
 * - Pola Quiet (Reviewer), consultant of the GV who switched the mail off
 * - Pina Care (Participant Care), who reads the mail log
 *
 * Every run starts without papers of the delegation and without their mails in the log.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { resetTeam } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';
import { upsertConference, upsertGvAndSr, upsertSeatedDelegations } from './conference';
import { upsertParticipant } from './participant';

const user = (name: string) => `e2e-pnt-${name}`;

export const paperNotificationsFixture = {
	conferenceId: 'e2e00000conference0000pnt',
	title: 'E2E Paper Notifications Conference',
	gvId: 'e2e00000pntcommittee00001',
	srId: 'e2e00000pntcommittee00002',
	gv: 'PNGV',
	sr: 'PNSR',
	gvAgendaItemId: 'e2e00000pntagendaitem0001',
	srAgendaItemId: 'e2e00000pntagendaitem0002',
	delegationId: 'e2e00000pntdelegation0001',
	author: { id: user('author'), given: 'Paula', family: 'Author' },
	srAuthor: { id: user('srauthor'), given: 'Sven', family: 'Rat' },
	team: {
		chair: { id: user('chair'), given: 'Pia', family: 'Chair', role: 'REVIEWER' },
		consultant: { id: user('consultant'), given: 'Pit', family: 'Berater', role: 'CONTENT_LEAD' },
		member: { id: user('member'), given: 'Pam', family: 'Member', role: 'MEMBER' },
		srChair: { id: user('srchair'), given: 'Per', family: 'Sicherheit', role: 'REVIEWER' },
		quiet: { id: user('quiet'), given: 'Pola', family: 'Quiet', role: 'REVIEWER' },
		care: { id: user('care'), given: 'Pina', family: 'Care', role: 'PARTICIPANT_CARE' }
	},
	functionIds: {
		chair: 'e2e00000pntfunction000001',
		consultant: 'e2e00000pntfunction000002',
		member: 'e2e00000pntfunction000003',
		srChair: 'e2e00000pntfunction000004',
		quiet: 'e2e00000pntfunction000005'
	},
	claims: (userId: string) => {
		const fixture = paperNotificationsFixture;
		const person = [fixture.author, fixture.srAuthor, ...Object.values(fixture.team)].find(
			(candidate) => candidate.id === userId
		);
		return person ? { given_name: person.given, family_name: person.family } : {};
	}
} as const;

export async function seedPaperNotifications(db: NodePgDatabase) {
	const fixture = paperNotificationsFixture;
	const { id: conferenceId } = await upsertConference(db, {
		id: fixture.conferenceId,
		title: fixture.title,
		state: 'PREPARATION',
		nations: { deu: 'de' }
	});
	await db
		.update(schema.conference)
		.set({
			assignmentReleased: true,
			assignmentReleasedAt: new Date(),
			isOpenPaperSubmission: true
		})
		.where(eq(schema.conference.id, conferenceId));
	await upsertGvAndSr(db, { fixture, nations: ['deu'] });
	for (const [id, committeeId] of [
		[fixture.gvAgendaItemId, fixture.gvId],
		[fixture.srAgendaItemId, fixture.srId]
	] as const) {
		const agendaItem = { id, committeeId, title: `E2E Topic ${committeeId.slice(-1)}` };
		await db
			.insert(schema.committeeAgendaItem)
			.values(agendaItem)
			.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: agendaItem });
	}

	await upsertUsers(
		db,
		[fixture.author, fixture.srAuthor, ...Object.values(fixture.team)].map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: person.given,
			familyName: person.family,
			locale: 'de',
			messageNotificationEmails: true
		}))
	);

	// the delegation without the papers and their mails a run before left
	await upsertSeatedDelegations(db, {
		conferenceId,
		delegations: [[fixture.delegationId, 'deu']]
	});
	await db.delete(schema.paper).where(eq(schema.paper.delegationId, fixture.delegationId));
	await db
		.delete(schema.emailLog)
		.where(
			and(
				eq(schema.emailLog.conferenceId, conferenceId),
				eq(schema.emailLog.kind, 'PAPER_SUBMITTED')
			)
		);
	for (const [person, committeeId, isHeadDelegate] of [
		[fixture.author, fixture.gvId, true],
		[fixture.srAuthor, fixture.srId, false]
	] as const) {
		const member = {
			...makeSeedDelegationMember({
				delegationId: fixture.delegationId,
				conferenceParticipantId: await upsertParticipant(db, conferenceId, person.id),
				assignedCommitteeId: committeeId,
				isHeadDelegate
			}),
			id: `e2e-pnt-member-${person.id}`
		};
		await db
			.insert(schema.delegationMember)
			.values(member)
			.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
	}

	// the team with its functions; the choices went along with the functions a run before
	const teamMemberIds = await resetTeam(db, { conferenceId, team: Object.values(fixture.team) });
	await db
		.delete(schema.notificationPreference)
		.where(inArray(schema.notificationPreference.teamMemberId, teamMemberIds));
	const functionOf = (
		person: keyof typeof fixture.functionIds,
		committeeId: string,
		kind: 'CHAIR' | 'CONSULTANT'
	) => ({
		id: fixture.functionIds[person],
		teamMemberId: `e2e-team-${fixture.team[person].id}`,
		committeeId,
		kind
	});
	await db
		.insert(schema.teamFunction)
		.values([
			functionOf('chair', fixture.gvId, 'CHAIR'),
			functionOf('consultant', fixture.gvId, 'CONSULTANT'),
			functionOf('member', fixture.gvId, 'CHAIR'),
			functionOf('srChair', fixture.srId, 'CHAIR'),
			functionOf('quiet', fixture.gvId, 'CONSULTANT')
		]);
	await db.insert(schema.notificationPreference).values({
		teamMemberId: `e2e-team-${fixture.team.quiet.id}`,
		topic: 'COMMITTEE_PAPERS',
		teamFunctionId: fixture.functionIds.quiet,
		channel: 'EMAIL',
		enabled: false
	});
}
