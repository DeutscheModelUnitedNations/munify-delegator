/**
 * Fixtures for the team's notification settings (e2e/authorization/notifications.spec.ts).
 *
 * A conference of its own in PREPARATION with messaging on, and a team:
 * - Nora Care (participant care), who answers the participant care inbox and hears of reports
 * - Nils Chair (team role MEMBER), chair of the Generalversammlung
 * - Nele Trost (team role MEMBER), a trusted person
 * - Nico Plain (team role MEMBER), without any function
 * - Nina Projekt (project management), who picks the Slack workspace
 * - Noah Quiet (participant care), who switched the unread-messages mails off before there were
 *   settings per topic
 * and a Slack workspace nobody picked yet, with a token no test ever sends to Slack.
 *
 * Every run starts without stored choices and without a workspace for the conference.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { resetTeam } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';
import { upsertConference, upsertGvAndSr } from './conference';

const user = (name: string) => `e2e-ntf-${name}`;

export const notificationsFixture = {
	conferenceId: 'e2e00000conference0000ntf',
	title: 'E2E Notifications Conference',
	gvId: 'e2e00000ntfcommittee00001',
	srId: 'e2e00000ntfcommittee00002',
	gv: 'NTGV',
	sr: 'NTSR',
	workspaceId: 'e2e00000ntfworkspace00001',
	workspaceName: 'E2E Slack',
	chairFunctionId: 'e2e00000ntffunction000001',
	team: {
		care: { id: user('care'), given: 'Nora', family: 'Care', role: 'PARTICIPANT_CARE' },
		chair: { id: user('chair'), given: 'Nils', family: 'Chair', role: 'MEMBER' },
		trusted: { id: user('trusted'), given: 'Nele', family: 'Trost', role: 'MEMBER' },
		plain: { id: user('plain'), given: 'Nico', family: 'Plain', role: 'MEMBER' },
		management: { id: user('pm'), given: 'Nina', family: 'Projekt', role: 'PROJECT_MANAGEMENT' },
		quiet: { id: user('quiet'), given: 'Noah', family: 'Quiet', role: 'PARTICIPANT_CARE' }
	},
	/** Somebody with an account and no part in the conference. */
	outsiderId: user('outsider'),
	claims: (userId: string) => {
		const person = Object.values(notificationsFixture.team).find(
			(candidate) => candidate.id === userId
		);
		return person ? { given_name: person.given, family_name: person.family } : {};
	}
} as const;

export async function seedNotifications(db: NodePgDatabase) {
	const fixture = notificationsFixture;
	const { id: conferenceId } = await upsertConference(db, {
		id: fixture.conferenceId,
		title: fixture.title,
		state: 'PREPARATION',
		nations: { deu: 'de' }
	});
	await db
		.update(schema.conference)
		.set({ messagingEnabled: true })
		.where(eq(schema.conference.id, conferenceId));
	await upsertGvAndSr(db, { fixture, nations: ['deu'] });

	await upsertUsers(db, [
		...Object.values(fixture.team).map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: person.given,
			familyName: person.family,
			messageNotificationEmails: person.id !== fixture.team.quiet.id
		})),
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: fixture.outsiderId,
			givenName: 'Olga',
			familyName: 'Outside'
		}
	]);

	// what a run left: the functions (their choices go along), every other choice, the workspace
	const teamMemberIds = await resetTeam(db, { conferenceId, team: Object.values(fixture.team) });
	await db
		.delete(schema.notificationPreference)
		.where(inArray(schema.notificationPreference.teamMemberId, teamMemberIds));
	await db.delete(schema.slackWorkspace).where(eq(schema.slackWorkspace.id, fixture.workspaceId));
	await db.insert(schema.teamFunction).values([
		{
			id: fixture.chairFunctionId,
			teamMemberId: `e2e-team-${fixture.team.chair.id}`,
			committeeId: fixture.gvId,
			kind: 'CHAIR'
		},
		{ teamMemberId: `e2e-team-${fixture.team.trusted.id}`, kind: 'TRUSTED_PERSON' }
	]);
	await db.insert(schema.slackWorkspace).values({
		id: fixture.workspaceId,
		name: fixture.workspaceName,
		slackTeamId: 'TE2ENTF',
		slackTeamName: 'E2E Slack Team',
		// not a ciphertext of anything: no spec makes the app talk to Slack
		botTokenCiphertext: 'e2e-not-a-token'
	});
}
