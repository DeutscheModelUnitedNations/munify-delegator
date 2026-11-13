/**
 * Fixtures for the announcements (e2e/announcements/, e2e/authorization/announcements.spec.ts).
 *
 * A conference of its own in PREPARATION with the roles released. GV and SR have one seat per
 * delegation:
 * - Germany: Anna Alpha (head delegate, GV) and Bert Beta (SR)
 * - France: Carla Gamma (head delegate, GV)
 * - Susi Supervisor, who supervises nobody
 * - Willi Warte on the waiting list
 * - the team: participant care, a reviewer and a plain member
 * - Olga Ohne, who has no part in the conference
 *
 * Every run starts with the same announcements (`ANNOUNCEMENTS`): one for everybody (pinned),
 * one for GV (important), one for supervisors, one for the team, a draft, a scheduled and an
 * expired one, and nothing read. There are two such conferences with people of their own
 * (`announcementsFixture`): the flows and the authorization rules run side by side.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
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

/** One of the two conferences: `ui` for e2e/announcements/, `auth` for e2e/authorization/. */
export function announcementsFixture(tag: 'ui' | 'auth') {
	const key = tag === 'ui' ? 'anu' : 'ana';
	const user = (name: string) => `e2e-${key}-${name}`;
	const people = {
		anna: { id: user('anna'), given: 'Anna', family: 'Alpha' },
		bert: { id: user('bert'), given: 'Bert', family: 'Beta' },
		carla: { id: user('carla'), given: 'Carla', family: 'Gamma' },
		supervisor: { id: user('supervisor'), given: 'Susi', family: 'Supervisor' },
		waiting: { id: user('waiting'), given: 'Willi', family: 'Warte' },
		outsider: { id: user('outsider'), given: 'Olga', family: 'Ohne' },
		care: { id: user('care'), given: 'Cora', family: 'Care' },
		reviewer: { id: user('reviewer'), given: 'Rita', family: 'Reviewer' },
		member: { id: user('member'), given: 'Milan', family: 'Mitglied' }
	} as const;
	const announcement = (name: string) => `e2e-${key}-announcement-${name}`;
	return {
		key,
		conferenceId: `e2e00000conference0000${key}`,
		title: tag === 'ui' ? 'E2E Announcements Conference' : 'E2E Announcements Rules Conference',
		gvId: `e2e00000${key}committee00001`,
		srId: `e2e00000${key}committee00002`,
		gv: tag === 'ui' ? 'ANGV' : 'AAGV',
		sr: tag === 'ui' ? 'ANSR' : 'AASR',
		germanyDelegationId: `e2e00000${key}delegation0001`,
		franceDelegationId: `e2e00000${key}delegation0002`,
		people,
		announcements: {
			welcome: { id: announcement('welcome'), title: 'Willkommen zur Konferenz' },
			gv: { id: announcement('gv'), title: 'Raumwechsel der Generalversammlung' },
			supervisors: { id: announcement('supervisors'), title: 'Hinweise für Betreuende' },
			team: { id: announcement('team'), title: 'Teambriefing am Vorabend' },
			draft: { id: announcement('draft'), title: 'Entwurf zur Abreise' },
			scheduled: { id: announcement('scheduled'), title: 'Geplante Ankündigung' },
			expired: { id: announcement('expired'), title: 'Abgelaufene Ankündigung' }
		},
		/** The name a person of the fixture signs in with, which the login keeps on the account. */
		claims: (userId: string) => {
			const person = Object.values(people).find((candidate) => candidate.id === userId);
			return person ? { given_name: person.given, family_name: person.family } : {};
		}
	};
}

type Fixture = ReturnType<typeof announcementsFixture>;

export async function seedAnnouncements(db: NodePgDatabase) {
	await seedAnnouncementsConference(db, announcementsFixture('ui'));
	await seedAnnouncementsConference(db, announcementsFixture('auth'));
}

async function seedAnnouncementsConference(db: NodePgDatabase, fixture: Fixture) {
	const { id: conferenceId } = await upsertConference(db, {
		id: fixture.conferenceId,
		title: fixture.title,
		state: 'PREPARATION',
		nations: NATIONS
	});
	await db
		.update(schema.conference)
		.set({ assignmentReleased: true })
		.where(eq(schema.conference.id, conferenceId));

	await upsertSeatedCommittees(db, {
		conferenceId,
		committees: [
			{ id: fixture.gvId, name: 'Generalversammlung', abbreviation: fixture.gv },
			{ id: fixture.srId, name: 'Sicherheitsrat', abbreviation: fixture.sr }
		],
		nations: Object.keys(NATIONS)
	});

	const { people } = fixture;
	await upsertUsers(
		db,
		Object.values(people).map((person) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: person.id,
			givenName: person.given,
			familyName: person.family
		}))
	);

	await upsertTeamMember(db, conferenceId, people.care.id, 'PARTICIPANT_CARE');
	await upsertTeamMember(db, conferenceId, people.reviewer.id, 'REVIEWER');
	await upsertTeamMember(db, conferenceId, people.member.id, 'MEMBER');

	await seedPeople(db, fixture);
	await seedRows(db, fixture);
}

async function seedPeople(db: NodePgDatabase, fixture: Fixture) {
	const { conferenceId, people } = fixture;
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

	const members = [
		[people.anna, fixture.germanyDelegationId, fixture.gvId, true, 1],
		[people.bert, fixture.germanyDelegationId, fixture.srId, false, 2],
		[people.carla, fixture.franceDelegationId, fixture.gvId, true, 3]
	] as const;
	for (const [delegate, delegationId, assignedCommitteeId, isHeadDelegate, number] of members) {
		const conferenceParticipantId = await upsertParticipant(db, conferenceId, delegate.id);
		const member = {
			...makeSeedDelegationMember({
				delegationId,
				conferenceParticipantId,
				assignedCommitteeId,
				isHeadDelegate
			}),
			id: `e2e00000${fixture.key}member000000${number}`
		};
		await db
			.insert(schema.delegationMember)
			.values(member)
			.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
	}

	const supervisorParticipantId = await upsertParticipant(db, conferenceId, people.supervisor.id);
	await db
		.insert(schema.conferenceSupervisor)
		.values({
			id: `e2e00000${fixture.key}supervisor0001`,
			conferenceParticipantId: supervisorParticipantId,
			plansOwnAttendenceAtConference: true,
			connectionCode: `E2E${fixture.key.toUpperCase()}SV`
		})
		.onConflictDoNothing();

	await db
		.insert(schema.waitingListEntry)
		.values({
			id: `e2e00000${fixture.key}waiting0000001`,
			conferenceId,
			userId: people.waiting.id,
			experience: 'E2E',
			motivation: 'E2E',
			requests: null
		})
		.onConflictDoNothing();
}

const HOUR = 60 * 60 * 1000;

/** The announcements every run starts with; whatever a run wrote, published or read goes. */
async function seedRows(db: NodePgDatabase, fixture: Fixture) {
	const { conferenceId, announcements, people } = fixture;
	await db.delete(schema.announcement).where(eq(schema.announcement.conferenceId, conferenceId));
	await db.delete(schema.emailLog).where(eq(schema.emailLog.conferenceId, conferenceId));

	const now = Date.now();
	const published = (hoursAgo: number) => ({
		status: 'PUBLISHED' as const,
		publishAt: new Date(now - hoursAgo * HOUR),
		releaseAnnounced: true,
		publishedById: people.care.id
	});
	const base = { conferenceId, authorId: people.care.id };
	await db.insert(schema.announcement).values([
		{
			...base,
			...published(48),
			id: announcements.welcome.id,
			title: announcements.welcome.title,
			body: 'Schön, dass ihr dabei seid. **Alle Infos** folgen hier.',
			pinned: true,
			signature: 'Euer Team der Teilnehmendenbetreuung'
		},
		{
			...base,
			...published(3),
			id: announcements.gv.id,
			title: announcements.gv.title,
			body: 'Die Generalversammlung tagt ab morgen im Plenarsaal.',
			importance: 'IMPORTANT'
		},
		{
			...base,
			...published(5),
			id: announcements.supervisors.id,
			title: announcements.supervisors.title,
			body: 'Bitte denkt an die Aufsichtspflicht.'
		},
		{
			...base,
			...published(6),
			id: announcements.team.id,
			title: announcements.team.title,
			body: 'Wir treffen uns um 19 Uhr im Teamraum.'
		},
		{
			...base,
			id: announcements.draft.id,
			title: announcements.draft.title,
			body: 'Die Abreise ist am Sonntag ab 14 Uhr.'
		},
		{
			...base,
			id: announcements.scheduled.id,
			title: announcements.scheduled.title,
			body: 'Das wird erst später sichtbar.',
			status: 'PUBLISHED',
			publishAt: new Date(now + 240 * HOUR),
			mailSince: new Date(now + 240 * HOUR),
			publishedById: people.care.id
		},
		{
			...base,
			...published(72),
			id: announcements.expired.id,
			title: announcements.expired.title,
			body: 'Das war nur bis gestern wichtig.',
			visibleUntil: new Date(now - 24 * HOUR)
		}
	]);

	const audience = (
		announcementId: string,
		block: Omit<typeof schema.announcementAudience.$inferInsert, 'announcementId'>
	) => ({ ...block, announcementId });
	await db
		.insert(schema.announcementAudience)
		.values([
			audience(announcements.welcome.id, { kind: 'EVERYONE' }),
			audience(announcements.gv.id, { kind: 'COMMITTEE', committeeId: fixture.gvId }),
			audience(announcements.supervisors.id, { kind: 'SUPERVISORS' }),
			audience(announcements.team.id, { kind: 'TEAM' }),
			audience(announcements.draft.id, { kind: 'EVERYONE' }),
			audience(announcements.scheduled.id, { kind: 'EVERYONE' }),
			audience(announcements.expired.id, { kind: 'EVERYONE' })
		]);
}
