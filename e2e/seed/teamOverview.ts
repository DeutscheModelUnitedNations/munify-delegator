/**
 * Fixtures for the widgets of the team's overview (e2e/dashboard/team-overview.spec.ts,
 * e2e/authorization/team-overview.spec.ts).
 *
 * Three conferences with the same team (project management, participant care, a reviewer, a plain
 * member): one in preparation with a published survey nobody answered yet, one running with a
 * minor whose guardians' consent is missing and an adult who passed the entrance check today, and
 * one after the conference with one person whose attendance is recorded. Every run builds them
 * anew; only the entrance scan depends on the day the run happens.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const TEAM_OVERVIEW = {
	preparationId: 'e2e00000conference0000ovp',
	activeId: 'e2e00000conference0000ova',
	postId: 'e2e00000conference0000ovo',
	managementId: 'e2e-ovw-management',
	careId: 'e2e-ovw-care',
	reviewerId: 'e2e-ovw-reviewer',
	memberId: 'e2e-ovw-member',
	surveyId: 'e2e00000ovwsurvey00000001',
	surveyTitle: 'Workshopwahl',
	/** The browser's clock for the preparation specs: after the applications, before the payment deadline */
	preparationNow: '2027-01-25T10:00:00Z'
} as const;

const TEAM = [
	{ id: TEAM_OVERVIEW.managementId, role: 'PROJECT_MANAGEMENT' },
	{ id: TEAM_OVERVIEW.careId, role: 'PARTICIPANT_CARE' },
	{ id: TEAM_OVERVIEW.reviewerId, role: 'REVIEWER' },
	{ id: TEAM_OVERVIEW.memberId, role: 'MEMBER' }
] as const;

/** Who holds a seat where: [user id, conference id, birthday] */
const SEATED = [
	['e2e-ovw-delegate', TEAM_OVERVIEW.preparationId, new Date('2008-02-01')],
	['e2e-ovw-minor', TEAM_OVERVIEW.activeId, new Date('2012-06-01')],
	['e2e-ovw-adult', TEAM_OVERVIEW.activeId, new Date('1999-06-01')],
	['e2e-ovw-attended', TEAM_OVERVIEW.postId, new Date('2000-06-01')]
] as const;

const CHECK_SESSION_ID = 'e2e00000ovwchecksession01';

export async function seedTeamOverview(db: NodePgDatabase) {
	const conferences = [
		[TEAM_OVERVIEW.preparationId, 'PREPARATION', 'E2E Overview Preparation'],
		[TEAM_OVERVIEW.activeId, 'ACTIVE', 'E2E Overview Running'],
		[TEAM_OVERVIEW.postId, 'POST', 'E2E Overview After']
	] as const;
	for (const [id, state, title] of conferences) {
		await upsertConference(db, { id, title, state, nations: {} });
	}
	// Fixed dates for the preparation, so the timeline the specs read does not move with the day
	await db
		.update(schema.conference)
		.set({
			applicationDeadline: new Date('2027-01-10T22:59:00Z'),
			paymentDeadline: new Date('2027-02-01T22:59:00Z'),
			startConference: new Date('2027-03-10T00:00:00Z'),
			endConference: new Date('2027-03-12T00:00:00Z'),
			assignmentReleased: false,
			guidePublished: false
		})
		.where(eq(schema.conference.id, TEAM_OVERVIEW.preparationId));

	await upsertUsers(db, [
		...TEAM.map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: 'Overview',
			familyName: person.role
		})),
		...SEATED.map(([id, , birthday]) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id,
			givenName: 'Seated',
			familyName: 'Person',
			birthday
		}))
	]);
	await db.delete(schema.teamMember).where(
		inArray(
			schema.teamMember.userId,
			TEAM.map((person) => person.id)
		)
	);
	for (const [conferenceId] of conferences) {
		for (const person of TEAM) {
			// one row per conference: the shared helper keys a membership by the user alone
			const teamMember = {
				...makeSeedTeamMember({ conferenceId, userId: person.id, role: person.role }),
				id: `e2e-team-${person.id}-${conferenceId}`
			};
			await db
				.insert(schema.teamMember)
				.values(teamMember)
				.onConflictDoUpdate({ target: schema.teamMember.id, set: teamMember });
		}
	}

	const participantIds = new Map<string, string>();
	for (const [userId, conferenceId] of SEATED) {
		participantIds.set(userId, await seat(db, { conferenceId, userId }));
	}

	// Preparation: a published survey nobody answered
	await db
		.delete(schema.surveyQuestion)
		.where(eq(schema.surveyQuestion.id, TEAM_OVERVIEW.surveyId));
	await db.insert(schema.surveyQuestion).values({
		id: TEAM_OVERVIEW.surveyId,
		conferenceId: TEAM_OVERVIEW.preparationId,
		title: TEAM_OVERVIEW.surveyTitle,
		description: 'Welchen Workshop besuchst du?',
		deadline: new Date('2027-02-05T22:59:00Z'),
		draft: false
	});

	// Running: the minor's consent is missing, the adult passed the entrance check today
	await db
		.update(schema.conferenceParticipant)
		.set({ guardianConsent: 'PENDING' })
		.where(inArray(schema.conferenceParticipant.id, [participantIds.get('e2e-ovw-minor') ?? '']));
	await db
		.delete(schema.attendanceSession)
		.where(eq(schema.attendanceSession.id, CHECK_SESSION_ID));
	await db.insert(schema.attendanceSession).values({
		id: CHECK_SESSION_ID,
		conferenceId: TEAM_OVERVIEW.activeId,
		occasion: 'Einlass',
		mode: 'CHECK',
		createdById: TEAM_OVERVIEW.careId
	});
	await db.insert(schema.attendanceEntry).values({
		sessionId: CHECK_SESSION_ID,
		conferenceParticipantId: participantIds.get('e2e-ovw-adult') ?? '',
		recordedById: TEAM_OVERVIEW.careId,
		checkPassed: true
	});

	// After: one person's attendance is recorded
	await db
		.update(schema.conferenceParticipant)
		.set({ didAttend: true })
		.where(eq(schema.conferenceParticipant.id, participantIds.get('e2e-ovw-attended') ?? ''));
}

/** A seat for the person: a custom role of the conference held as a single participant. */
async function seat(
	db: NodePgDatabase,
	{ conferenceId, userId }: { conferenceId: string; userId: string }
) {
	const role = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: `e2e-ovw-role-${userId}`,
		name: `Overview ${userId}`
	};
	await db
		.insert(schema.conferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: role });
	const participantId = await upsertParticipant(db, conferenceId, userId);
	const single = {
		...makeSeedSingleParticipant({ conferenceParticipantId: participantId, applied: true }),
		id: `e2e-ovw-single-${userId}`,
		assignedRoleId: role.id
	};
	await db
		.insert(schema.singleParticipant)
		.values(single)
		.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });
	return participantId;
}
