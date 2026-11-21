/**
 * Fixtures for the guide specs (e2e/authorization/guide.spec.ts).
 *
 * Two conferences of one series (A, published and released, and B, of another year) and one
 * without a series (C, another organizer's). A has a committee with an agenda item, a delegate
 * seated in it, a content lead and a reviewer; B and C each a content lead. A page shared
 * everywhere, a page of A alone and the committee's page are published, with A's sidebar.
 *
 * Every run puts the pages, versions and sidebars back as they are here.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray, like } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertCommittee, upsertConference, upsertSeatedDelegations } from './conference';
import { seatNations } from './conferenceRole';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_GUIDE = {
	conferenceA: 'e2e00000conference0000017',
	conferenceB: 'e2e00000conference0000018',
	conferenceC: 'e2e00000conference0000019',
	series: 'e2e00000guideseries000001',
	committee: 'e2e00000guidecommittee001',
	agendaItem: 'e2e00000guideagendaitem01',
	pages: {
		everywhere: 'e2e00000guidepage00000001',
		own: 'e2e00000guidepage00000002',
		committee: 'e2e00000guidepage00000003',
		hidden: 'e2e00000guidepage00000004'
	},
	people: {
		contentLeadA: 'e2e-guide-content-lead-a',
		reviewerA: 'e2e-guide-reviewer-a',
		delegateA: 'e2e-guide-delegate-a',
		contentLeadB: 'e2e-guide-content-lead-b',
		contentLeadC: 'e2e-guide-content-lead-c'
	}
} as const;

/** The text every fixture page starts with, which the reader's page shows. */
export const E2E_GUIDE_TEXT = 'Willkommen bei {{Konferenz}} im {{Gremium}}.';

const doc = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

type Scope = { seriesId?: string; conferenceId?: string };

/** A published page: its row, its first version, and the page pointing at it. */
async function publishedPage(
	db: NodePgDatabase,
	{
		id,
		title,
		scope,
		owner
	}: {
		id: string;
		title: string;
		scope: Scope;
		owner?: { committeeId: string };
	}
) {
	const versionId = `${id}v1`;
	const columns = {
		seriesId: scope.seriesId ?? null,
		year: null,
		conferenceId: scope.conferenceId ?? null
	};
	await db.insert(schema.guidePage).values({
		id,
		kind: owner ? 'COMMITTEE' : 'GENERAL',
		committeeId: owner?.committeeId ?? null,
		title,
		content: doc(E2E_GUIDE_TEXT),
		...columns
	});
	await db.insert(schema.guidePageVersion).values({
		id: versionId,
		pageId: id,
		number: 1,
		title,
		content: doc(E2E_GUIDE_TEXT),
		...columns
	});
	await db
		.update(schema.guidePage)
		.set({
			publishedVersionId: versionId,
			publishedSeriesId: columns.seriesId,
			publishedYear: null,
			publishedConferenceId: columns.conferenceId
		})
		.where(eq(schema.guidePage.id, id));
}

export async function seedGuide(db: NodePgDatabase) {
	const g = E2E_GUIDE;
	await upsertUsers(
		db,
		Object.values(g.people).map((id) => ({ ...makeSeedUser(), ...COMPLETE_PROFILE, id }))
	);

	// a run starts without the pages and sidebars of the last one
	await db
		.delete(schema.guideOutline)
		.where(
			inArray(schema.guideOutline.conferenceId, [g.conferenceA, g.conferenceB, g.conferenceC])
		);
	await db.delete(schema.guidePage).where(inArray(schema.guidePage.id, Object.values(g.pages)));
	await db
		.delete(schema.guidePage)
		.where(inArray(schema.guidePage.conferenceId, [g.conferenceA, g.conferenceB, g.conferenceC]));
	await db.delete(schema.guidePage).where(like(schema.guidePage.title, 'E2E created%'));

	await db
		.insert(schema.conferenceSeries)
		.values({ id: g.series, name: 'E2E Series', abbreviation: 'E2E' })
		.onConflictDoNothing();

	for (const [id, title, seriesId] of [
		[g.conferenceA, 'E2E Guide A', g.series],
		[g.conferenceB, 'E2E Guide B', g.series],
		[g.conferenceC, 'E2E Guide C', null]
	] as const) {
		await upsertConference(db, { id, title, state: 'PREPARATION', nations: { DEU: 'DE' } });
		await db
			.update(schema.conference)
			.set({
				seriesId,
				guidePublished: id === g.conferenceA,
				assignmentReleased: true,
				assignmentReleasedAt: new Date()
			})
			.where(eq(schema.conference.id, id));
	}

	// A's committee, its agenda item, and a delegate seated in it
	const committee = await upsertCommittee(
		db,
		g.conferenceA,
		{ id: g.committee, name: 'Guide Committee', abbreviation: 'GC' },
		0
	);
	await db
		.insert(schema.committeeAgendaItem)
		.values({ id: g.agendaItem, title: 'Guide Topic', committeeId: committee.id })
		.onConflictDoNothing();
	await seatNations(db, committee, ['DEU']);
	const delegationId = 'e2e00000guidedelegation01';
	await upsertSeatedDelegations(db, {
		conferenceId: g.conferenceA,
		delegations: [[delegationId, 'DEU']]
	});
	const member = {
		...makeSeedDelegationMember({
			delegationId,
			conferenceParticipantId: await upsertParticipant(db, g.conferenceA, g.people.delegateA),
			isHeadDelegate: true
		}),
		id: 'e2e00000guidemember000001',
		assignedCommitteeId: committee.id
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });

	await upsertTeamMember(db, g.conferenceA, g.people.contentLeadA, 'CONTENT_LEAD');
	await upsertTeamMember(db, g.conferenceA, g.people.reviewerA, 'REVIEWER');
	await upsertTeamMember(db, g.conferenceB, g.people.contentLeadB, 'CONTENT_LEAD');
	await upsertTeamMember(db, g.conferenceC, g.people.contentLeadC, 'CONTENT_LEAD');

	await publishedPage(db, { id: g.pages.everywhere, title: 'Shared everywhere', scope: {} });
	await publishedPage(db, {
		id: g.pages.own,
		title: 'Only A',
		scope: { conferenceId: g.conferenceA }
	});
	await publishedPage(db, {
		id: g.pages.committee,
		title: 'Committee page',
		scope: { conferenceId: g.conferenceA },
		owner: { committeeId: committee.id }
	});
	// published, but in no sidebar
	await publishedPage(db, {
		id: g.pages.hidden,
		title: 'Not in the sidebar',
		scope: { conferenceId: g.conferenceA }
	});

	const outline = {
		sections: [
			{
				id: 'start',
				title: 'Start',
				audience: { type: 'everyone' },
				entries: [{ pageId: g.pages.everywhere }]
			},
			{
				id: 'nsa',
				title: 'For NSAs',
				audience: { type: 'nonStateActors' },
				entries: [{ pageId: g.pages.own }]
			}
		],
		committeeTemplate: {
			position: 1,
			titleFormat: 'COMMITTEE_NAME',
			slots: [{ type: 'committeePage' }]
		}
	};
	await db.insert(schema.guideOutline).values({
		id: 'e2e00000guideoutline00001',
		conferenceId: g.conferenceA,
		draft: outline,
		published: outline,
		publishedAt: new Date()
	});
}
