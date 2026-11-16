/**
 * Fixtures for the conference papers spec (e2e/authorization/conference-papers.spec.ts).
 *
 * Two conferences of their own, each with one committee (GV) seating Germany and France. In the
 * released one:
 * - Germany's delegation, Ada Author and Mia Mate, wrote a position paper with three versions: the
 *   first was sent back by Rita Reviewer, the second accepted, the third is an edit Ada has not
 *   handed in. A second paper of hers is still a draft.
 * - France's delegation is Dana Delegate, supervised by Tom Teacher.
 * - Sina Single holds a custom role; Uwe Unseated applied as single participant and got none.
 * In the unreleased one Germany's delegation handed in a paper too, and Dana sits for France: until
 * the release nobody but the delegation and the team reads it.
 *
 * Nothing changes these rows, so reruns only write them again.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCustomConferenceRole } from '../../src/api/db/seed-data/conferenceRole';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedSingleParticipant } from '../../src/api/db/seed-data/singleParticipant';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertCommittee, upsertConference } from './conference';
import { seatNations, upsertNationRole } from './conferenceRole';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_PAPERS_CONFERENCE_ID = 'e2e00000conference0000013';
export const E2E_PAPERS_UNRELEASED_CONFERENCE_ID = 'e2e00000conference0000014';

export const E2E_PAPERS_PEOPLE = {
	author: 'e2e-papers-author',
	mate: 'e2e-papers-mate',
	delegate: 'e2e-papers-delegate',
	supervisor: 'e2e-papers-supervisor',
	single: 'e2e-papers-single',
	unseated: 'e2e-papers-unseated',
	reviewer: 'e2e-papers-reviewer'
} as const;

export const E2E_PAPERS_AUTHOR_DELEGATION_ID = 'e2e00000papersdelegation01';
const E2E_PAPERS_READER_DELEGATION_ID = 'e2e00000papersdelegation02';
export const E2E_PAPERS_SUBMITTED_PAPER_ID = 'e2e00000paperspaper0000001';
export const E2E_PAPERS_DRAFT_PAPER_ID = 'e2e00000paperspaper0000002';
export const E2E_PAPERS_UNRELEASED_PAPER_ID = 'e2e00000paperspaper0000003';
/** The versions of the submitted paper, oldest first; the second is the latest one handed in. */
export const E2E_PAPERS_VERSION_IDS = {
	returned: 'e2e00000papersversion00001',
	accepted: 'e2e00000papersversion00002',
	unsubmitted: 'e2e00000papersversion00003'
} as const;
export const E2E_PAPERS_ACCEPTED_TEXT = 'The accepted position of Germany.';

const NATIONS = { DEU: 'DE', FRA: 'FR' };

/** The editor's document as the app stores it: a JSON string in the jsonb column. */
const contentOf = (text: string) =>
	JSON.stringify({
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
	});

/** A conference with GV seating Germany and France, an agenda item, and both delegations. */
async function seedConference(
	db: NodePgDatabase,
	{ id, title, released, key }: { id: string; title: string; released: boolean; key: string }
) {
	await upsertConference(db, { id, title, state: 'PREPARATION', nations: NATIONS });
	await db
		.update(schema.conference)
		.set({
			assignmentReleased: released,
			assignmentReleasedAt: released ? new Date() : null,
			isOpenPaperSubmission: true
		})
		.where(eq(schema.conference.id, id));

	const committee = await upsertCommittee(
		db,
		id,
		{ id: `e2e00000paperscommittee0${key}`, name: 'Generalversammlung', abbreviation: 'GV' },
		0
	);
	await seatNations(db, committee, Object.keys(NATIONS));
	const agendaItem = {
		id: `e2e00000papersagendaitem${key}`,
		title: 'E2E Conference Papers Topic',
		committeeId: committee.id
	};
	await db
		.insert(schema.committeeAgendaItem)
		.values(agendaItem)
		.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: agendaItem });

	/** A delegation holding the nation's role, with `userIds` as its members (the first leads it). */
	async function delegationOf({
		delegationId,
		nation,
		userIds
	}: {
		delegationId: string;
		nation: keyof typeof NATIONS;
		userIds: readonly string[];
	}) {
		const delegation = {
			...makeSeedDelegation({ conferenceId: id, applied: true }),
			id: delegationId,
			entryCode: `PAP${nation}${key}`,
			assignedRoleId: await upsertNationRole(db, id, nation)
		};
		await db
			.insert(schema.delegation)
			.values(delegation)
			.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
		const participantIds: string[] = [];
		for (const [index, userId] of userIds.entries()) {
			const conferenceParticipantId = await upsertParticipant(db, id, userId);
			const member = {
				...makeSeedDelegationMember({
					delegationId,
					conferenceParticipantId,
					assignedCommitteeId: committee.id,
					isHeadDelegate: index === 0
				}),
				id: `e2e-papers-member-${key}-${userId}`
			};
			await db
				.insert(schema.delegationMember)
				.values(member)
				.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
			participantIds.push(conferenceParticipantId);
		}
		return participantIds;
	}

	return { agendaItemId: agendaItem.id, delegationOf };
}

type PaperStatus = (typeof schema.paper.$inferInsert)['status'];

/** A position paper with its versions, numbered in order. */
async function upsertPaper(
	db: NodePgDatabase,
	paper: {
		id: string;
		status: PaperStatus;
		authorParticipantId: string;
		delegationId: string;
		agendaItemId: string;
	},
	versions: readonly { id: string; status: PaperStatus; text: string }[]
) {
	const row = {
		...paper,
		type: 'POSITION_PAPER' as const,
		firstSubmittedAt: paper.status === 'DRAFT' ? null : new Date()
	};
	await db
		.insert(schema.paper)
		.values(row)
		.onConflictDoUpdate({ target: schema.paper.id, set: row });
	for (const [index, { text, ...version }] of versions.entries()) {
		const versionRow = {
			...version,
			version: index + 1,
			content: contentOf(text),
			paperId: paper.id
		};
		await db
			.insert(schema.paperVersion)
			.values(versionRow)
			.onConflictDoUpdate({ target: schema.paperVersion.id, set: versionRow });
	}
}

export async function seedConferencePapers(db: NodePgDatabase) {
	const people = E2E_PAPERS_PEOPLE;
	await upsertUsers(
		db,
		Object.values(people).map((id) => ({ ...makeSeedUser(), ...COMPLETE_PROFILE, id }))
	);

	// --- the released conference ---
	const conferenceId = E2E_PAPERS_CONFERENCE_ID;
	const released = await seedConference(db, {
		id: conferenceId,
		title: 'E2E Conference Papers',
		released: true,
		key: '1'
	});
	await upsertTeamMember(db, conferenceId, people.reviewer, 'REVIEWER');
	const [authorParticipantId] = await released.delegationOf({
		delegationId: E2E_PAPERS_AUTHOR_DELEGATION_ID,
		nation: 'DEU',
		userIds: [people.author, people.mate]
	});
	const [delegateParticipantId] = await released.delegationOf({
		delegationId: E2E_PAPERS_READER_DELEGATION_ID,
		nation: 'FRA',
		userIds: [people.delegate]
	});

	const versionIds = E2E_PAPERS_VERSION_IDS;
	await upsertPaper(
		db,
		{
			id: E2E_PAPERS_SUBMITTED_PAPER_ID,
			status: 'ACCEPTED',
			authorParticipantId,
			delegationId: E2E_PAPERS_AUTHOR_DELEGATION_ID,
			agendaItemId: released.agendaItemId
		},
		[
			{ id: versionIds.returned, status: 'CHANGES_REQUESTED', text: 'A first attempt.' },
			{ id: versionIds.accepted, status: 'ACCEPTED', text: E2E_PAPERS_ACCEPTED_TEXT },
			{ id: versionIds.unsubmitted, status: 'DRAFT', text: 'An edit not handed in yet.' }
		]
	);
	await db
		.delete(schema.paperReview)
		.where(inArray(schema.paperReview.paperVersionId, Object.values(versionIds)));
	await db.insert(schema.paperReview).values([
		{
			comments: contentOf('Please rework the second paragraph.'),
			reviewerId: people.reviewer,
			paperVersionId: versionIds.returned,
			statusBefore: 'SUBMITTED',
			statusAfter: 'CHANGES_REQUESTED'
		},
		{
			comments: contentOf('Well done.'),
			reviewerId: people.reviewer,
			paperVersionId: versionIds.accepted,
			statusBefore: 'REVISED',
			statusAfter: 'ACCEPTED'
		}
	]);
	await upsertPaper(
		db,
		{
			id: E2E_PAPERS_DRAFT_PAPER_ID,
			status: 'DRAFT',
			authorParticipantId,
			delegationId: E2E_PAPERS_AUTHOR_DELEGATION_ID,
			agendaItemId: released.agendaItemId
		},
		[{ id: 'e2e00000papersversion00004', status: 'DRAFT', text: 'Still a draft.' }]
	);

	// Tom Teacher supervises Dana Delegate
	const supervisor = {
		id: 'e2e00000paperssupervisor01',
		conferenceParticipantId: await upsertParticipant(db, conferenceId, people.supervisor),
		plansOwnAttendenceAtConference: true,
		connectionCode: 'PAPERSTOM'
	};
	await db
		.insert(schema.conferenceSupervisor)
		.values(supervisor)
		.onConflictDoUpdate({ target: schema.conferenceSupervisor.id, set: supervisor });
	await db
		.insert(schema.supervision)
		.values({ a: supervisor.id, b: delegateParticipantId })
		.onConflictDoNothing();

	// Sina Single holds a custom role, Uwe Unseated applied and holds none
	const role = {
		...makeSeedCustomConferenceRole({ conferenceId }),
		id: 'e2e00000papersrole00000001',
		name: 'E2E Press'
	};
	await db
		.insert(schema.conferenceRole)
		.values(role)
		.onConflictDoUpdate({ target: schema.conferenceRole.id, set: role });
	for (const [userId, assignedRoleId] of [
		[people.single, role.id],
		[people.unseated, null]
	] as const) {
		const single = {
			...makeSeedSingleParticipant({
				conferenceParticipantId: await upsertParticipant(db, conferenceId, userId),
				applied: true,
				assignedRoleId
			}),
			id: `e2e-papers-single-${userId}`
		};
		await db
			.insert(schema.singleParticipant)
			.values(single)
			.onConflictDoUpdate({ target: schema.singleParticipant.id, set: single });
	}

	// --- the unreleased conference: the same two delegations, one paper handed in ---
	const unreleased = await seedConference(db, {
		id: E2E_PAPERS_UNRELEASED_CONFERENCE_ID,
		title: 'E2E Conference Papers Unreleased',
		released: false,
		key: '2'
	});
	const [unreleasedAuthorParticipantId] = await unreleased.delegationOf({
		delegationId: 'e2e00000papersdelegation03',
		nation: 'DEU',
		userIds: [people.author]
	});
	await unreleased.delegationOf({
		delegationId: 'e2e00000papersdelegation04',
		nation: 'FRA',
		userIds: [people.delegate]
	});
	await upsertPaper(
		db,
		{
			id: E2E_PAPERS_UNRELEASED_PAPER_ID,
			status: 'SUBMITTED',
			authorParticipantId: unreleasedAuthorParticipantId,
			delegationId: 'e2e00000papersdelegation03',
			agendaItemId: unreleased.agendaItemId
		},
		[{ id: 'e2e00000papersversion00005', status: 'SUBMITTED', text: 'Handed in before release.' }]
	);
}
