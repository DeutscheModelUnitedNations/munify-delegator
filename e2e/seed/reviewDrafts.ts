/**
 * Fixtures for the review draft specs (e2e/authorization/review-drafts.spec.ts and
 * e2e/papers/review-draft.spec.ts).
 *
 * A conference that switched AI assistants on, with a reviewer, a second reviewer and project
 * management on its team, and one delegation with three submitted position papers: one for the
 * API checks, one for the editor's lifecycle and one to discard a draft of. A second conference,
 * where assistants stay off, has a paper the same reviewer reviews too.
 *
 * Every run puts the papers back to one submitted version without reviews or drafts.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertCommittee, upsertConference } from './conference';
import { seatNations, upsertNationRole } from './conferenceRole';
import { upsertParticipant } from './participant';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_DRAFTS_CONFERENCE_ID = 'e2e00000conference0000015';
export const E2E_DRAFTS_OFF_CONFERENCE_ID = 'e2e00000conference0000016';

export const E2E_DRAFTS_PEOPLE = {
	reviewer: 'e2e-drafts-reviewer',
	otherReviewer: 'e2e-drafts-reviewer-2',
	management: 'e2e-drafts-management',
	author: 'e2e-drafts-author'
} as const;

/** The committee and agenda item the paper hub groups the papers under. */
export const E2E_DRAFTS_COMMITTEE_NAME = 'E2E Drafts Committee';
export const E2E_DRAFTS_AGENDA_ITEM_TITLE = 'E2E Drafts Agenda Item';

export const E2E_DRAFTS_PAPER_IDS = {
	api: 'e2e00000draftspaper000001',
	lifecycle: 'e2e00000draftspaper000002',
	discard: 'e2e00000draftspaper000003',
	off: 'e2e00000draftspaper000004'
} as const;

/** A sentence of every paper, word for word, that a quote of it can find. */
export const E2E_DRAFTS_PAPER_SENTENCE =
	'Die Delegation fordert ein entschlossenes, gemeinsames Handeln der Staatengemeinschaft.';

/** The first version of each paper; a spec adds a second one to make a draft stale. */
export const firstVersionId = (paperId: string) => `${paperId}v1`;

function paperContent() {
	return {
		type: 'doc',
		content: [
			{ type: 'paragraph', content: [{ type: 'text', text: 'Einleitung zum Thema.' }] },
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Die Delegation ' },
					{ type: 'text', text: 'fordert', marks: [{ type: 'italic' }] },
					{
						type: 'text',
						text: ' ein entschlossenes, gemeinsames Handeln der Staatengemeinschaft.'
					}
				]
			}
		]
	};
}

/** A team row of its own per conference: `upsertTeamMember` keys it by the user alone. */
async function putOnTeam(
	db: NodePgDatabase,
	{
		conferenceId,
		userId,
		role
	}: {
		conferenceId: string;
		userId: string;
		role: (typeof schema.teamMember.$inferInsert)['role'];
	}
) {
	const row = {
		...makeSeedTeamMember({ conferenceId, userId, role }),
		id: `e2e-team-${conferenceId.slice(-2)}-${userId}`
	};
	await db
		.insert(schema.teamMember)
		.values(row)
		.onConflictDoUpdate({ target: schema.teamMember.id, set: row });
}

/** A conference with Ada's delegation and its submitted papers, reset to one version each. */
async function seedConference(
	db: NodePgDatabase,
	{
		id,
		title,
		mcpEnabled,
		paperIds
	}: { id: string; title: string; mcpEnabled: boolean; paperIds: readonly string[] }
) {
	// the paper views draw the delegation's flag, so it holds Germany's seat
	await upsertConference(db, { id, title, state: 'PREPARATION', nations: { DEU: 'DE' } });
	await db
		.update(schema.conference)
		.set({ mcpEnabled, isOpenPaperSubmission: true })
		.where(eq(schema.conference.id, id));

	const delegation = {
		...makeSeedDelegation({ conferenceId: id, applied: true }),
		id: `e2e00000draftsdelegation${id.slice(-2)}`,
		entryCode: `DRAFTS${id.slice(-2)}`
	};
	await db
		.insert(schema.delegation)
		.values(delegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
	const authorParticipantId = await upsertParticipant(db, id, E2E_DRAFTS_PEOPLE.author);
	const member = {
		...makeSeedDelegationMember({
			delegationId: delegation.id,
			conferenceParticipantId: authorParticipantId,
			isHeadDelegate: true
		}),
		id: `e2e00000draftsmember${id.slice(-2)}`
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });

	const committee = await upsertCommittee(
		db,
		id,
		{
			id: `e2e00000draftscommittee0${id.slice(-2)}`,
			name: E2E_DRAFTS_COMMITTEE_NAME,
			abbreviation: 'EDC'
		},
		0
	);
	const agendaItem = {
		id: `e2e00000draftsagendaitem${id.slice(-2)}`,
		title: E2E_DRAFTS_AGENDA_ITEM_TITLE,
		committeeId: committee.id
	};
	await db
		.insert(schema.committeeAgendaItem)
		.values(agendaItem)
		.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: agendaItem });
	await seatNations(db, committee, ['DEU']);
	await db
		.update(schema.delegation)
		.set({ assignedRoleId: await upsertNationRole(db, id, 'DEU') })
		.where(eq(schema.delegation.id, delegation.id));

	// The papers as a run should find them: submitted, one version, no review, no draft
	await db
		.delete(schema.paperReviewDraft)
		.where(inArray(schema.paperReviewDraft.paperId, paperIds));
	await db.delete(schema.paperVersion).where(inArray(schema.paperVersion.paperId, paperIds));
	for (const paperId of paperIds) {
		const paper = {
			id: paperId,
			authorParticipantId,
			delegationId: delegation.id,
			agendaItemId: agendaItem.id,
			status: 'SUBMITTED' as const,
			type: 'POSITION_PAPER' as const,
			firstSubmittedAt: new Date()
		};
		await db
			.insert(schema.paper)
			.values(paper)
			.onConflictDoUpdate({ target: schema.paper.id, set: paper });
		await db.insert(schema.paperVersion).values({
			id: firstVersionId(paperId),
			version: 1,
			content: paperContent(),
			paperId,
			status: 'SUBMITTED'
		});
	}
}

export async function seedReviewDrafts(db: NodePgDatabase) {
	const people = E2E_DRAFTS_PEOPLE;
	await upsertUsers(
		db,
		Object.values(people).map((id) => ({ ...makeSeedUser(), ...COMPLETE_PROFILE, id }))
	);
	const papers = E2E_DRAFTS_PAPER_IDS;
	await seedConference(db, {
		id: E2E_DRAFTS_CONFERENCE_ID,
		title: 'E2E Review Drafts',
		mcpEnabled: true,
		paperIds: [papers.api, papers.lifecycle, papers.discard]
	});
	await seedConference(db, {
		id: E2E_DRAFTS_OFF_CONFERENCE_ID,
		title: 'E2E Review Drafts Without Assistants',
		mcpEnabled: false,
		paperIds: [papers.off]
	});
	for (const [userId, role] of [
		[people.reviewer, 'REVIEWER'],
		[people.otherReviewer, 'REVIEWER'],
		[people.management, 'PROJECT_MANAGEMENT']
	] as const) {
		await putOnTeam(db, { conferenceId: E2E_DRAFTS_CONFERENCE_ID, userId, role });
	}
	await putOnTeam(db, {
		conferenceId: E2E_DRAFTS_OFF_CONFERENCE_ID,
		userId: people.reviewer,
		role: 'REVIEWER'
	});
}
