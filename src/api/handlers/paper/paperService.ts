import { z } from 'zod';
import { type Transaction, db, schema } from '#api/db/db';
import codenmz from '#lib/helpers/codenamize';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import type { InferSelectModel } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { apiError } from '#api/services/errors';
import { paperPubsub, paperVersionPubsub } from '#api/pubsub';

type PaperStatus = (typeof schema.paper.$inferSelect)['status'];
type PaperContent = (typeof schema.paperVersion.$inferInsert)['content'];

/**
 * The statuses an author saves a paper with. ACCEPTED and CHANGES_REQUESTED are verdicts, which
 * only reviews hand out; REVISED is normalised (`paperSubmissionChanges`).
 */
export const authorStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'REVISED'], {
	error: () => m.paperStatusOnlyThroughReview()
});
export type AuthorStatus = z.output<typeof authorStatusSchema>;

/** A new paper is a draft or goes straight out; REVISED answers a review, and it has had none. */
export const newPaperStatusSchema = z.enum(['DRAFT', 'SUBMITTED'], {
	error: () => m.paperNewDraftOrSubmission()
});

/**
 * What an update of a paper writes besides its content.
 *
 * A status left out keeps the paper's (a reviewer's edit of the text always does). A resubmission
 * of an already-reviewed paper counts as REVISED, not SUBMITTED - and a client asking for REVISED
 * directly is normalised to SUBMITTED first, so this rule is the only thing that can produce
 * REVISED. The first save that leaves the paper anything but a draft marks it as submitted.
 */
export function paperSubmissionChanges({
	paper,
	requestedStatus,
	now
}: {
	paper: { status: PaperStatus; firstSubmittedAt: Date | null; versions: { reviews: unknown[] }[] };
	requestedStatus: AuthorStatus | null | undefined;
	now: Date;
}): { status: PaperStatus; firstSubmittedAt: Date | undefined } {
	const hasAnyReviews = paper.versions.some((version) => version.reviews.length > 0);
	const normalised = requestedStatus === 'REVISED' ? 'SUBMITTED' : requestedStatus;
	const status =
		normalised === 'SUBMITTED' && hasAnyReviews ? 'REVISED' : (normalised ?? paper.status);
	const isFirstSubmission = paper.firstSubmittedAt === null && status !== 'DRAFT';

	return { status, firstSubmittedAt: isFirstSubmission ? now : undefined };
}

type NewPaper = {
	/** The author's part in the conference, which `assertCanCreatePaper` found. */
	authorParticipantId: string;
	delegationId: string;
	agendaItemId?: string | null;
	type: (typeof schema.paper.$inferSelect)['type'];
	content: PaperContent;
	status: z.output<typeof newPaperStatusSchema>;
};

/** The rows of a new paper: the paper (stamped as submitted if it goes straight out) and its first version. */
export function newPaperRows({ args, now }: { args: NewPaper; now: Date }) {
	return {
		paper: {
			authorParticipantId: args.authorParticipantId,
			delegationId: args.delegationId,
			agendaItemId: args.agendaItemId ?? undefined,
			type: args.type,
			status: args.status,
			firstSubmittedAt: args.status === 'SUBMITTED' ? now : undefined
		},
		// The content lives on versions, never on the paper row itself.
		version: { content: args.content, status: args.status, version: 1 }
	};
}

/** Refuses (CONFLICT) unless the conference takes papers. */
async function assertPaperSubmissionOpen({
	tx,
	conferenceId
}: {
	tx: Transaction;
	conferenceId: string;
}) {
	const conference = await tx.query.conference
		.findFirst({ where: { id: conferenceId }, columns: { isOpenPaperSubmission: true } })
		.then(assertFindFirstExists);
	if (!conference.isOpenPaperSubmission) {
		throw apiError({ code: 'CONFLICT', message: m.paperSubmissionClosed() });
	}
}

/**
 * Writes a new paper in the conference together with its first version, unless the conference
 * takes no papers (CONFLICT). Returns its id.
 */
export async function createPaper({
	conferenceId,
	paper: newPaper
}: {
	conferenceId: string;
	paper: NewPaper;
}) {
	const paperId = await db.transaction(async (tx) => {
		await assertPaperSubmissionOpen({ tx, conferenceId });

		const rows = newPaperRows({ args: newPaper, now: new Date() });
		const { id } = await tx
			.insert(schema.paper)
			.values(rows.paper)
			.returning({ id: schema.paper.id })
			.then(assertFirstEntryExists);

		await tx.insert(schema.paperVersion).values({ ...rows.version, paperId: id });

		return id;
	});
	paperPubsub.created();
	paperVersionPubsub.created();
	return paperId;
}

/**
 * Saves a new version of the paper rather than editing the previous one, unless its conference
 * takes no papers any more (CONFLICT). A status left out keeps the paper's.
 */
export async function updatePaper({
	paperId,
	content,
	status: requestedStatus
}: {
	paperId: string;
	content: PaperContent;
	status: AuthorStatus | null | undefined;
}) {
	await db.transaction(async (tx) => {
		const paper = await tx.query.paper
			.findFirst({
				where: { id: paperId },
				columns: { status: true, firstSubmittedAt: true },
				with: {
					versions: { columns: { id: true }, with: { reviews: { columns: { id: true } } } },
					delegation: { columns: { conferenceId: true } }
				}
			})
			.then(assertFindFirstExists);

		await assertPaperSubmissionOpen({ tx, conferenceId: paper.delegation.conferenceId });

		const { status, firstSubmittedAt } = paperSubmissionChanges({
			paper,
			requestedStatus,
			now: new Date()
		});

		await tx
			.update(schema.paper)
			.set({ status, firstSubmittedAt, updatedAt: new Date() })
			.where(whereRows({ table: schema.paper, filter: { id: paperId } }));

		await tx.insert(schema.paperVersion).values({
			paperId,
			content,
			status,
			version: paper.versions.length + 1
		});
	});
	paperPubsub.updated(paperId);
	paperVersionPubsub.created();
}

type CommitteeRow = InferSelectModel<typeof schema.committee>;
type AgendaItemRow = InferSelectModel<typeof schema.committeeAgendaItem>;
type PaperRow = InferSelectModel<typeof schema.paper>;

export type AgendaItemGroup = { agendaItem: AgendaItemRow; papers: PaperRow[] };
export type CommitteeGroup = { committee: CommitteeRow; agendaItems: AgendaItemGroup[] };

/**
 * Groups a conference's submitted papers by committee, then by agenda item.
 *
 * Papers without an agenda item are skipped - those are introduction papers, which have their
 * own query. Grouping happens in memory rather than in SQL because the result is a nested shape
 * rather than an aggregate.
 */
export function groupPapersByCommittee(
	papers: (PaperRow & {
		agendaItem: (AgendaItemRow & { committee: CommitteeRow | null }) | null;
	})[]
): CommitteeGroup[] {
	const byCommittee = new Map<
		string,
		{ committee: CommitteeRow; items: Map<string, AgendaItemGroup> }
	>();

	for (const paper of papers) {
		const agendaItem = paper.agendaItem;
		const committee = agendaItem?.committee;
		if (!agendaItem || !committee) continue;

		let committeeGroup = byCommittee.get(committee.id);
		if (!committeeGroup) {
			committeeGroup = { committee, items: new Map() };
			byCommittee.set(committee.id, committeeGroup);
		}

		let itemGroup = committeeGroup.items.get(agendaItem.id);
		if (!itemGroup) {
			itemGroup = { agendaItem, papers: [] };
			committeeGroup.items.set(agendaItem.id, itemGroup);
		}

		itemGroup.papers.push(paper);
	}

	return [...byCommittee.values()].map((group) => ({
		committee: group.committee,
		agendaItems: [...group.items.values()]
	}));
}

/**
 * Every review of the conference in the order they were written.
 *
 * The tiebreaker on `id` keeps the "who reviewed this paper first" attribution stable across
 * calls when two reviews share a timestamp.
 */
async function fetchConferenceReviews(conferenceId: string) {
	return db.query.paperReview.findMany({
		where: { paperVersion: { paper: { delegation: { conferenceId } } } },
		columns: { id: true, reviewerId: true, createdAt: true },
		with: { paperVersion: { columns: { paperId: true } } },
		orderBy: { createdAt: 'asc', id: 'asc' }
	});
}

/** Top ten reviewers of a conference, ranked by how often they got to a paper first. */
export async function reviewerLeaderboard({
	conferenceId,
	callerId
}: {
	conferenceId: string;
	callerId: string | undefined;
}) {
	const reviews = await fetchConferenceReviews(conferenceId);

	const paperFirstReviewer = new Map<string, string>();
	const reviewerStats = new Map<string, { first: number; total: number }>();

	for (const review of reviews) {
		const paperId = review.paperVersion.paperId;
		const reviewerId = review.reviewerId;

		const stats = reviewerStats.get(reviewerId) ?? { first: 0, total: 0 };
		reviewerStats.set(reviewerId, stats);
		stats.total++;

		if (!paperFirstReviewer.has(paperId)) {
			paperFirstReviewer.set(paperId, reviewerId);
			stats.first++;
		}
	}

	return [...reviewerStats.entries()]
		.map(([id, stats]) => ({
			anonymizedName: codenmz(id),
			firstReviews: stats.first,
			totalReviews: stats.total,
			isCurrentUser: id === callerId
		}))
		.sort((a, b) => b.firstReviews - a.firstReviews)
		.slice(0, 10);
}

/**
 * A reviewer's counts over a conference's reviews (in the order they were written): how many
 * papers they reviewed first, and how many of their reviews followed someone else's.
 */
export function reviewStatsFrom({
	reviews,
	callerId
}: {
	reviews: readonly { reviewerId: string; paperVersion: { paperId: string } }[];
	callerId: string;
}) {
	const paperFirstReviewer = new Map<string, string>();
	for (const review of reviews) {
		const paperId = review.paperVersion.paperId;
		if (!paperFirstReviewer.has(paperId)) paperFirstReviewer.set(paperId, review.reviewerId);
	}

	const totalReviews = reviews.filter((review) => review.reviewerId === callerId).length;
	const firstReviews = [...paperFirstReviewer.values()].filter((id) => id === callerId).length;

	return {
		firstReviews,
		followUpReviews: totalReviews - firstReviews,
		totalReviews
	};
}

/** The caller's own review counts within a conference. */
export async function reviewStatsOf({
	conferenceId,
	callerId
}: {
	conferenceId: string;
	callerId: string;
}) {
	return reviewStatsFrom({ reviews: await fetchConferenceReviews(conferenceId), callerId });
}

/**
 * The id of the paper a reviewer should pick up next for an agenda item: the least recently
 * touched one, with never-reviewed submissions taking precedence over revisions. Refuses
 * (NOT_FOUND) when none waits for a review.
 */
export async function nextPaperToReview(agendaItemId: string) {
	const papers = await db.query.paper.findMany({
		where: { agendaItemId, status: { in: ['SUBMITTED', 'REVISED'] } },
		columns: { id: true, status: true },
		orderBy: { updatedAt: 'asc' }
	});

	const next = papers.find((paper) => paper.status === 'SUBMITTED') ?? papers.at(0);
	if (!next) throw apiError({ code: 'NOT_FOUND', message: m.paperNoneForAgendaItem() });
	return next.id;
}
