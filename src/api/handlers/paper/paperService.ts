import type { Context } from '$api/context';
import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import { PAPER_ROLES, assertTeamRole, isSystemAdmin, userId } from '$api/services/authHelper';
import { fetchUserParticipations } from '$api/services/registration/participation';
import codenmz from '$lib/helpers/codenamize';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { type InferSelectModel, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

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
	throw new GraphQLError('A paper can only be accepted or sent back through a review');
}

/**
 * A paper is written by the caller, for a delegation they are a member of in that conference, on
 * one of that conference's agenda items (or none, for an introduction paper). All three arrive as
 * arguments, so all three are checked: the author cannot be somebody else, and the delegation and
 * agenda item cannot belong to another conference.
 */
async function assertMayAuthor(
	ctx: Context,
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
	}
) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (args.authorId !== caller) {
		throw new GraphQLError('Papers can only be written in your own name');
	}
	const membership = await db.query.delegationMember.findFirst({
		where: { userId: caller, delegationId: args.delegationId, conferenceId: args.conferenceId },
		columns: { id: true }
	});
	if (!membership) {
		throw new GraphQLError('You can only write papers for your own delegation');
	}
	if (args.agendaItemId) {
		await db.query.committeeAgendaItem
			.findFirst({
				where: { id: args.agendaItemId, committee: { conferenceId: args.conferenceId } },
				columns: { id: true }
			})
			.then(assertFindFirstExists);
	}
}

/** Writes a new paper together with its first version. */
export async function createPaper(
	ctx: Context,
	args: {
		conferenceId: string;
		authorId: string;
		delegationId: string;
		agendaItemId?: string | null;
		type: (typeof schema.paper.$inferSelect)['type'];
		content?: PaperContent;
		status?: PaperStatus | null;
	}
) {
	await assertMayAuthor(ctx, args);
	assertSavableStatus(args.status);
	// REVISED answers a review, and a new paper has had none.
	if (args.status === 'REVISED') {
		throw new GraphQLError('A new paper is either a draft or a submission');
	}

	return db.transaction(async (tx) => {
		const conference = await tx.query.conference
			.findFirst({ where: { id: args.conferenceId } })
			.then(assertFindFirstExists);

		if (!conference.isOpenPaperSubmission) {
			throw new GraphQLError(m.paperSubmissionClosed());
		}

		const paper = await tx
			.insert(schema.paper)
			.values({
				conferenceId: args.conferenceId,
				authorId: args.authorId,
				delegationId: args.delegationId,
				agendaItemId: args.agendaItemId ?? undefined,
				type: args.type,
				status: args.status ?? undefined,
				// Stamped only when the paper goes straight out as a submission.
				firstSubmittedAt: args.status === 'SUBMITTED' ? new Date() : undefined
			})
			.returning()
			.then(assertFirstEntryExists);

		// The content lives on versions, never on the paper row itself.
		await tx.insert(schema.paperVersion).values({
			paperId: paper.id,
			content: args.content,
			status: args.status ?? undefined,
			version: 1
		});

		return paper;
	});
}

/** Each update appends a new version rather than editing the previous one. */
export async function updatePaper(
	ctx: ApiContext,
	args: { paperId: string; content?: PaperContent; status?: PaperStatus | null }
) {
	if (!userId(ctx)) {
		throw new GraphQLError('Must be logged in');
	}

	await db.transaction(async (tx) => {
		const paper = await tx.query.paper
			.findFirst({
				...(await ctx.abilities.paper.filter('update')).merge({ where: { id: args.paperId } }).query
					.single,
				with: { versions: { with: { reviews: true } }, conference: true }
			})
			.then(assertFindFirstExists);

		if (!paper.conference?.isOpenPaperSubmission) {
			throw new GraphQLError(m.paperSubmissionClosed());
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

/** Reviewers and conference management of the conference, or a system admin. */
export function assertPaperReviewer(ctx: Context, conferenceId: string) {
	return assertTeamRole(ctx, conferenceId, PAPER_ROLES);
}

/** Any participant of the conference - delegate, single participant or supervisor - or an admin. */
export async function assertConferenceParticipant(ctx: Context, conferenceId: string) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return;
	const { foundDelegationMember, foundSingleParticipant, foundSupervisor } =
		await fetchUserParticipations({ conferenceId, userId: caller });
	if (![foundDelegationMember, foundSingleParticipant, foundSupervisor].some(Boolean)) {
		throw new GraphQLError('Access denied - requires conference participant status');
	}
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
		where: { paperVersion: { paper: { conferenceId } } },
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

/** The caller's own review counts within a conference. */
export async function reviewStatsOf(conferenceId: string, callerId: string) {
	const reviews = await fetchConferenceReviews(conferenceId);

	const paperFirstReviewer = new Map<string, string>();
	const countedFirstReviewPapers = new Set<string>();
	let firstReviews = 0;
	let totalReviews = 0;

	for (const review of reviews) {
		const paperId = review.paperVersion.paperId;
		const reviewerId = review.reviewerId;

		if (!paperFirstReviewer.has(paperId)) {
			paperFirstReviewer.set(paperId, reviewerId);
		}

		if (reviewerId !== callerId) continue;

		totalReviews++;
		if (paperFirstReviewer.get(paperId) === callerId && !countedFirstReviewPapers.has(paperId)) {
			countedFirstReviewPapers.add(paperId);
			firstReviews++;
		}
	}

	return {
		firstReviews,
		followUpReviews: totalReviews - firstReviews,
		totalReviews
	};
}

/**
 * The paper a reviewer should pick up next for an agenda item: the least recently touched
 * one, with never-reviewed submissions taking precedence over revisions.
 */
export async function findNextPaperToReview(ctx: Context, agendaItemId: string) {
	const agendaItem = await db.query.committeeAgendaItem
		.findFirst({
			where: { id: agendaItemId },
			columns: {},
			with: { committee: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);

	await assertPaperReviewer(ctx, agendaItem.committee.conferenceId);

	const papers = await db.query.paper.findMany({
		where: { agendaItemId, status: { in: ['SUBMITTED', 'REVISED'] } },
		orderBy: { updatedAt: 'asc' }
	});

	if (papers.length === 0) {
		throw new GraphQLError('No papers found for the specified agenda item.');
	}

	return papers.find((paper) => paper.status === 'SUBMITTED') ?? papers[0];
}
