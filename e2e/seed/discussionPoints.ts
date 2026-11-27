/**
 * Fixtures for the points for discussion (e2e/papers/discussion-points.spec.ts).
 *
 * A conference in preparation with AI assistants on and its guide published: one committee with
 * two agenda items, the first with points for discussion, the second without. A delegate seated in
 * the committee wrote a submitted position paper on the first. The content lead edits the points,
 * the reviewer reviews the paper. Both agenda items have a published page in the guide: the first
 * places the points with `{{Diskussionspunkte}}`, the second has no placeholder.
 *
 * Every run puts the points, the paper and the pages back as they are here.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertCommittee, upsertConference, upsertSeatedDelegations } from './conference';
import { seatNations } from './conferenceRole';
import { upsertParticipant } from './participant';
import { upsertSubmittedPaper } from './paper';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_POINTS = {
	conference: 'e2e00000conference0000023',
	committee: 'e2e00000pointscommittee01',
	agendaItems: {
		withPoints: 'e2e00000pointsagendaitem1',
		withoutPoints: 'e2e00000pointsagendaitem2'
	},
	pages: {
		withPoints: 'e2e00000pointsguidepage01',
		withoutPoints: 'e2e00000pointsguidepage02'
	},
	paper: 'e2e00000pointspaper000001',
	people: {
		contentLead: 'e2e-points-content-lead',
		reviewer: 'e2e-points-reviewer',
		delegate: 'e2e-points-delegate'
	}
} as const;

export const E2E_POINTS_TITLES = {
	withPoints: 'E2E Topic With Points',
	withoutPoints: 'E2E Topic Without Points'
} as const;

/** The first agenda item's points as a run starts. */
export const E2E_POINTS_SEEDED = [
	'Wie wird der Zugang zu sauberem Wasser finanziert?',
	'Welche Rolle spielen regionale Organisationen?'
];

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

/** A published agenda item page of the conference: row, first version, page pointing at it. */
async function publishedAgendaItemPage(
	db: NodePgDatabase,
	{
		id,
		agendaItemId,
		title,
		content
	}: { id: string; agendaItemId: string; title: string; content: unknown }
) {
	const conferenceId = E2E_POINTS.conference;
	const versionId = `${id}v1`;
	await db.insert(schema.guidePage).values({
		id,
		kind: 'AGENDA_ITEM',
		agendaItemId,
		conferenceId,
		title,
		content
	});
	await db.insert(schema.guidePageVersion).values({
		id: versionId,
		pageId: id,
		number: 1,
		title,
		content,
		conferenceId
	});
	await db
		.update(schema.guidePage)
		.set({ publishedVersionId: versionId, publishedConferenceId: conferenceId })
		.where(eq(schema.guidePage.id, id));
}

export async function seedDiscussionPoints(db: NodePgDatabase) {
	const p = E2E_POINTS;
	await upsertUsers(
		db,
		Object.values(p.people).map((id) => ({ ...makeSeedUser(), ...COMPLETE_PROFILE, id }))
	);

	// a run starts without the pages and sidebar of the last one
	await db.delete(schema.guideOutline).where(eq(schema.guideOutline.conferenceId, p.conference));
	await db.delete(schema.guidePage).where(inArray(schema.guidePage.id, Object.values(p.pages)));

	await upsertConference(db, {
		id: p.conference,
		title: 'E2E Points for Discussion',
		state: 'PREPARATION',
		nations: { DEU: 'DE' }
	});
	await db
		.update(schema.conference)
		.set({
			mcpEnabled: true,
			isOpenPaperSubmission: true,
			guidePublished: true,
			assignmentReleased: true,
			assignmentReleasedAt: new Date()
		})
		.where(eq(schema.conference.id, p.conference));

	const committee = await upsertCommittee(
		db,
		p.conference,
		{ id: p.committee, name: 'E2E Points Committee', abbreviation: 'EPC' },
		0
	);
	for (const [id, title, discussionPoints] of [
		[p.agendaItems.withPoints, E2E_POINTS_TITLES.withPoints, E2E_POINTS_SEEDED],
		[p.agendaItems.withoutPoints, E2E_POINTS_TITLES.withoutPoints, []]
	] as const) {
		const row = { id, title, committeeId: committee.id, discussionPoints: [...discussionPoints] };
		await db
			.insert(schema.committeeAgendaItem)
			.values(row)
			.onConflictDoUpdate({ target: schema.committeeAgendaItem.id, set: row });
	}
	await seatNations(db, committee, ['DEU']);

	const delegationId = 'e2e00000pointsdelegation1';
	await upsertSeatedDelegations(db, {
		conferenceId: p.conference,
		delegations: [[delegationId, 'DEU']]
	});
	const authorParticipantId = await upsertParticipant(db, p.conference, p.people.delegate);
	const member = {
		...makeSeedDelegationMember({
			delegationId,
			conferenceParticipantId: authorParticipantId,
			isHeadDelegate: true
		}),
		id: 'e2e00000pointsmember00001',
		assignedCommitteeId: committee.id
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });

	await upsertTeamMember(db, p.conference, p.people.contentLead, 'CONTENT_LEAD');
	await upsertTeamMember(db, p.conference, p.people.reviewer, 'REVIEWER');

	// the delegate's paper on the first agenda item: submitted, one version
	await db.delete(schema.paperVersion).where(eq(schema.paperVersion.paperId, p.paper));
	await upsertSubmittedPaper(db, {
		id: p.paper,
		authorParticipantId,
		delegationId,
		agendaItemId: p.agendaItems.withPoints,
		content: { type: 'doc', content: [paragraph('Die Delegation fordert sauberes Wasser.')] }
	});

	await publishedAgendaItemPage(db, {
		id: p.pages.withPoints,
		agendaItemId: p.agendaItems.withPoints,
		title: E2E_POINTS_TITLES.withPoints,
		content: {
			type: 'doc',
			content: [
				paragraph('Einleitung zum Thema.'),
				paragraph('{{Diskussionspunkte}}'),
				paragraph('Hintergrund zum Thema.')
			]
		}
	});
	await publishedAgendaItemPage(db, {
		id: p.pages.withoutPoints,
		agendaItemId: p.agendaItems.withoutPoints,
		title: E2E_POINTS_TITLES.withoutPoints,
		content: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'Punkte zur Diskussion' }]
				},
				{
					type: 'bulletList',
					content: [{ type: 'listItem', content: [paragraph('Ein Punkt aus dem alten Guide')] }]
				}
			]
		}
	});

	const outline = {
		sections: [],
		committeeTemplate: {
			position: 0,
			titleFormat: 'COMMITTEE_NAME',
			slots: [{ type: 'agendaItemPages' }]
		}
	};
	await db.insert(schema.guideOutline).values({
		id: 'e2e00000pointsoutline0001',
		conferenceId: p.conference,
		draft: outline,
		published: outline,
		publishedAt: new Date()
	});
}
