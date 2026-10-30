import { db, schema } from '#api/db/db';
import codenmz from '#lib/helpers/codenamize';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { type InferSelectModel, eq } from 'drizzle-orm';
import { apiError } from '#api/services/errors/apiError';

type PaperStatus = (typeof schema.paper.$inferSelect)['status'];
type PaperContent = (typeof schema.paperVersion.$inferInsert)['content'];

/**
 * What an update of a paper writes besides its content.
 *
 * A resubmission of an already-reviewed paper counts as REVISED, not SUBMITTED - and a client
 * asking for REVISED directly is normalised to SUBMITTED first, so this rule is the only thing
 * that can produce REVISED. The first update that is not a draft marks the paper as submitted.
 */
export function paperSubmissionChanges(
	paper: { firstSubmittedAt: Date | null; versions: { reviews: unknown[] }[] },
	requestedStatus: PaperStatus | null | undefined,
	now: Date
): { status: PaperStatus | undefined; firstSubmittedAt: Date | undefined } {
	const hasAnyReviews = paper.versions.some((version) => version.reviews.length > 0);
	const normalised = requestedStatus === 'REVISED' ? 'SUBMITTED' : requestedStatus;
	const status = normalised === 'SUBMITTED' && hasAnyReviews ? 'REVISED' : normalised;
	const isFirstSubmission = paper.firstSubmittedAt === null && requestedStatus !== 'DRAFT';

	return {
		status: status ?? undefined,
		firstSubmittedAt: isFirstSubmission ? now : undefined
	};
}

/** What an author may ask for; ACCEPTED and CHANGES_REQUESTED are verdicts, set by reviews. */
const AUTHOR_STATUSES: readonly PaperStatus[] = ['DRAFT', 'SUBMITTED', 'REVISED'];

/**
 * Refuses a status a save may not set. Authors move between draft and submitted; a reviewer
 * editing the text keeps whatever verdict the paper already has. Neither may hand out a verdict.
 */
function assertSavableStatus(requested: PaperStatus | null | undefined, current?: PaperStatus) {
	if (!requested || requested === current || AUTHOR_STATUSES.includes(requested)) return;
	throw apiError('CONFLICT', m.paperStatusOnlyThroughReview());
}

type NewPaper = {
	conferenceId: string;
	/** The author's part in the conference, which `assertCanCreatePaper` found. */
	authorParticipantId: string;
	delegationId: string;
	agendaItemId?: string | null;
	type: (typeof schema.paper.$inferSelect)['type'];
	content?: PaperContent;
	status?: PaperStatus | null;
};

/** The rows of a new paper: the paper (stamped as submitted if it goes straight out) and its first version. */
export function newPaperRows(args: NewPaper, now: Date) {
	return {
		paper: {
			authorParticipantId: args.authorParticipantId,
			delegationId: args.delegationId,
			agendaItemId: args.agendaItemId ?? undefined,
			type: args.type,
			status: args.status ?? undefined,
			firstSubmittedAt: args.status === 'SUBMITTED' ? now : undefined
		},
		// The content lives on versions, never on the paper row itself.
		version: { content: args.content, status: args.status ?? undefined, version: 1 }
	};
}

/** Writes a new paper together with its first version. */
export async function createPaper(args: NewPaper) {
	assertSavableStatus(args.status);
	// REVISED answers a review, and a new paper has had none.
	if (args.status === 'REVISED') {
		throw apiError('INVALID_INPUT', m.paperNewDraftOrSubmission());
	}

	return db.transaction(async (tx) => {
		const conference = await tx.query.conference
			.findFirst({ where: { id: args.conferenceId } })
			.then(assertFindFirstExists);

		if (!conference.isOpenPaperSubmission) {
			throw apiError('CONFLICT', m.paperSubmissionClosed());
		}

		const rows = newPaperRows(args, new Date());
		const paper = await tx
			.insert(schema.paper)
			.values(rows.paper)
			.returning()
			.then(assertFirstEntryExists);

		await tx.insert(schema.paperVersion).values({ ...rows.version, paperId: paper.id });

		return paper;
	});
}

/**
 * Each update appends a new version rather than editing the previous one. The caller's right to
 * update the paper is checked before (`assertCanUpdatePaper`).
 */
export async function updatePaper(args: {
	paperId: string;
	content?: PaperContent;
	status?: PaperStatus | null;
}) {
	await db.transaction(async (tx) => {
		const paper = await tx.query.paper
			.findFirst({
				where: { id: args.paperId },
				with: { versions: { with: { reviews: true } }, conference: true }
			})
			.then(assertFindFirstExists);

		if (!paper.conference?.isOpenPaperSubmission) {
			throw apiError('CONFLICT', m.paperSubmissionClosed());
		}
		assertSavableStatus(args.status, paper.status);

		const { status, firstSubmittedAt } = paperSubmissionChanges(paper, args.status, new Date());

		await tx
			.update(schema.paper)
			.set({ status, firstSubmittedAt, updatedAt: new Date() })
			.where(eq(schema.paper.id, args.paperId));

		await tx.insert(schema.paperVersion).values({
			paperId: args.paperId,
			content: args.content,
			status,
			version: paper.versions.length + 1
		});
	});
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
export async function reviewerLeaderboard(conferenceId: string, callerId: string | undefined) {
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
export function reviewStatsFrom(
	reviews: readonly { reviewerId: string; paperVersion: { paperId: string } }[],
	callerId: string
) {
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
export async function reviewStatsOf(conferenceId: string, callerId: string) {
	return reviewStatsFrom(await fetchConferenceReviews(conferenceId), callerId);
}

/**
 * The paper a reviewer should pick up next for an agenda item: the least recently touched
 * one, with never-reviewed submissions taking precedence over revisions.
 */
export async function findNextPaperToReview(agendaItemId: string) {
	const papers = await db.query.paper.findMany({
		where: { agendaItemId, status: { in: ['SUBMITTED', 'REVISED'] } },
		orderBy: { updatedAt: 'asc' }
	});

	if (papers.length === 0) {
		throw apiError('NOT_FOUND', m.paperNoneForAgendaItem());
	}

	return papers.find((paper) => paper.status === 'SUBMITTED') ?? papers[0];
}

/** The delegations of the conference with a member the user supervises. */
export async function supervisedDelegationIds(conferenceId: string, supervisorId: string) {
	const supervised = await db.query.delegationMember.findMany({
		where: {
			participant: { conferenceId },
			supervisors: { participant: { userId: supervisorId } }
		},
		columns: { delegationId: true }
	});
	return [...new Set(supervised.map((member) => member.delegationId))];
}
