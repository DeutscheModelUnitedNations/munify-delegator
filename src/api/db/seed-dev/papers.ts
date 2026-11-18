import { faker } from '@faker-js/faker';
import type * as schema from '../schema';
import type { DevAccountSub } from '../seed-data/devAccounts';
import {
	invalidResolutionDocument,
	paperDocument,
	resolutionDocument,
	reviewComments
} from '../seed-data/content';
import { markdownToReviewDocument } from '../../handlers/paperReviewDraft/reviewMarkdown';
import { PERSONA_NATION } from './conference';
import type { ConferenceSeed } from './context';

type PaperStatus = (typeof schema.paper.$inferSelect)['status'];
type PaperType = (typeof schema.paper.$inferSelect)['type'];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One step of a paper's history, oldest first. A `save` is a version the author stored; a
 * `review` is a verdict on the version before it, which sets that version's status as the app
 * does.
 */
type Step =
	| { save: 'DRAFT' | 'SUBMITTED' | 'REVISED' }
	| { review: 'CHANGES_REQUESTED' | 'ACCEPTED'; by: DevAccountSub };

interface PaperPlan {
	authorId: string;
	delegationId: string;
	type: PaperType;
	agendaItemId: string | null;
	title: string;
	history: Step[];
	/** Replaces the content of every version, for the invalid working paper. */
	content?: unknown;
	/**
	 * A review draft an AI assistant wrote for `by`: for the latest version, or for an earlier one
	 * (`forVersion`) and since edited in the app, which the editor warns about.
	 */
	reviewDraft?: { by: DevAccountSub; forVersion?: number };
}

/** What an assistant's draft says, quoting the paper word for word and once not. */
const DRAFT_MARKDOWN = `Liebe Delegation,

vielen Dank für euer Papier. Besonders überzeugt uns:

> Die Delegation bekräftigt ihr Bekenntnis zur Charta der Vereinten Nationen und fordert ein entschlossenes, gemeinsames Handeln der Staatengemeinschaft.

Bitte überarbeitet noch:

- die **Quellen**, die bisher fehlen
- den Abschnitt zur *Finanzierung*

> Ein Satz, der so nicht im Papier steht.`;

/** An assistant's review draft of the paper, for the version `draft` names (the latest by default). */
function addReviewDraft({
	cs,
	paperId,
	versionIds,
	start,
	draft
}: {
	cs: ConferenceSeed;
	paperId: string;
	versionIds: string[];
	start: number;
	draft: NonNullable<PaperPlan['reviewDraft']>;
}) {
	const forVersion = draft.forVersion ?? versionIds.length;
	const paperVersionId = versionIds[forVersion - 1];
	if (!paperVersionId) return;
	cs.batch.paperReviewDraft.push({
		paperId,
		reviewerId: draft.by,
		paperVersionId,
		comments: markdownToReviewDocument(DRAFT_MARKDOWN),
		statusAfter: 'CHANGES_REQUESTED',
		origin: 'MCP',
		// a draft for an older version has since been edited in the app
		lastEditedVia: forVersion < versionIds.length ? 'UI' : 'MCP',
		createdAt: new Date(start + (forVersion - 1) * DAY_MS + DAY_MS / 2)
	});
}

/**
 * Writes the paper with its versions and reviews, spaced a day apart and ending today, so the
 * history reads in order and `firstSubmittedAt` is the first save that was not a draft.
 */
function addPaper({ cs, plan }: { cs: ConferenceSeed; plan: PaperPlan }) {
	const paperId = faker.database.mongodbObjectId();
	const start = Date.now() - plan.history.length * DAY_MS;
	const versions: { id: string; status: PaperStatus }[] = [];
	let status: PaperStatus = 'DRAFT';
	let firstSubmittedAt: Date | null = null;
	let statusBefore: PaperStatus = 'DRAFT';

	plan.history.forEach((step, index) => {
		const createdAt = new Date(start + index * DAY_MS);
		if ('save' in step) {
			const versionId = faker.database.mongodbObjectId();
			status = step.save;
			if (status !== 'DRAFT' && !firstSubmittedAt) firstSubmittedAt = createdAt;
			versions.push({ id: versionId, status });
			cs.batch.paperVersion.push({
				id: versionId,
				paperId,
				version: versions.length,
				status,
				createdAt,
				content:
					plan.content ??
					(plan.type === 'WORKING_PAPER'
						? resolutionDocument(plan.title)
						: paperDocument({ title: plan.title, version: versions.length }))
			});
			statusBefore = status;
			return;
		}
		const latest = versions[versions.length - 1];
		latest.status = step.review;
		status = step.review;
		cs.batch.paperReview.push({
			paperVersionId: latest.id,
			reviewerId: step.by,
			comments: reviewComments(step.review),
			statusBefore,
			statusAfter: step.review,
			createdAt
		});
		statusBefore = step.review;
	});

	if (plan.reviewDraft) {
		addReviewDraft({
			cs,
			paperId,
			versionIds: versions.map((v) => v.id),
			start,
			draft: plan.reviewDraft
		});
	}

	// Reviews change the reviewed version's status after the fact.
	for (const version of versions) {
		const row = cs.batch.paperVersion.find((candidate) => candidate.id === version.id);
		if (row) row.status = version.status;
	}

	cs.batch.paper.push({
		id: paperId,
		authorParticipantId: cs.participant(plan.authorId).id,
		delegationId: plan.delegationId,
		type: plan.type,
		agendaItemId: plan.agendaItemId,
		status,
		firstSubmittedAt,
		createdAt: new Date(start),
		updatedAt: new Date()
	});
}

/**
 * Every paper status, written by the personas, plus a review queue from the crowd. The flag
 * collection follows from it: Germany has found the pieces of its reviewed agenda items.
 */
export function addPapers(cs: ConferenceSeed) {
	if (!cs.plan.with.papers) return;

	const germany = cs.nationDelegations.find((delegation) => delegation.nation === PERSONA_NATION);
	const nsaDelegationId = cs.rowId('delegation-nsa');
	if (!germany) return;
	const committeeOf = (userId: string) =>
		cs.committees.find(
			(committee) =>
				committee.id === germany.members.find((member) => member.userId === userId)?.committeeId
		) ?? cs.committees[2];
	const [head, delegate, minor] = ['dev-head-delegate', 'dev-delegate', 'dev-delegate-minor'].map(
		committeeOf
	);

	addPaper({
		cs,
		plan: {
			authorId: 'dev-delegate',
			delegationId: germany.delegationId,
			type: 'POSITION_PAPER',
			agendaItemId: delegate.agendaItemIds[0],
			title: 'Positionspapier Deutschland (angenommen)',
			history: [
				{ save: 'SUBMITTED' },
				{ review: 'CHANGES_REQUESTED', by: 'dev-team-reviewer' },
				{ save: 'REVISED' },
				{ review: 'ACCEPTED', by: 'dev-team-pm' }
			]
		}
	});
	addPaper({
		cs,
		plan: {
			authorId: 'dev-head-delegate',
			delegationId: germany.delegationId,
			type: 'POSITION_PAPER',
			agendaItemId: head.agendaItemIds[0],
			title: 'Positionspapier Deutschland (Änderungen erbeten)',
			history: [{ save: 'SUBMITTED' }, { review: 'CHANGES_REQUESTED', by: 'dev-team-reviewer' }]
		}
	});
	addPaper({
		cs,
		plan: {
			authorId: 'dev-head-delegate',
			delegationId: germany.delegationId,
			type: 'WORKING_PAPER',
			agendaItemId: head.agendaItemIds[1],
			title: head.name,
			history: [{ save: 'SUBMITTED' }]
		}
	});
	addPaper({
		cs,
		plan: {
			authorId: 'dev-delegate-minor',
			delegationId: germany.delegationId,
			type: 'POSITION_PAPER',
			agendaItemId: minor.agendaItemIds[0],
			title: 'Positionspapier Deutschland (Entwurf)',
			history: [{ save: 'DRAFT' }, { save: 'DRAFT' }]
		}
	});
	addPaper({
		cs,
		plan: {
			authorId: 'dev-nsa-delegate',
			delegationId: nsaDelegationId,
			type: 'INTRODUCTION_PAPER',
			agendaItemId: null,
			title: 'Vorstellung unserer Organisation (überarbeitet)',
			history: [
				{ save: 'SUBMITTED' },
				{ review: 'CHANGES_REQUESTED', by: 'dev-team-reviewer' },
				{ save: 'REVISED' }
			],
			// a draft for the first version, edited since: the editor warns it is stale
			reviewDraft: { by: 'dev-team-reviewer', forVersion: 1 }
		}
	});
	addPaper({
		cs,
		plan: {
			authorId: 'dev-nsa-delegate',
			delegationId: nsaDelegationId,
			type: 'POSITION_PAPER',
			agendaItemId: cs.committees[3]?.agendaItemIds[0] ?? head.agendaItemIds[0],
			title: 'Positionspapier unserer Organisation (eingereicht)',
			history: [{ save: 'SUBMITTED' }]
		}
	});

	// A queue for the reviewers: submitted papers from the crowd, and one broken working paper.
	const crowdDelegations = cs.nationDelegations.filter((delegation) => delegation !== germany);
	crowdDelegations.slice(0, 6).forEach((delegation, index) => {
		const author = delegation.members[0];
		const committee =
			cs.committees.find((candidate) => candidate.id === author.committeeId) ?? cs.committees[0];
		addPaper({
			cs,
			plan: {
				authorId: author.userId,
				delegationId: delegation.delegationId,
				type: index === 5 ? 'WORKING_PAPER' : 'POSITION_PAPER',
				agendaItemId: committee.agendaItemIds[index % 2],
				title: `Positionspapier ${delegation.nation.toUpperCase()}`,
				history: [{ save: 'SUBMITTED' }],
				content: index === 5 ? invalidResolutionDocument : undefined,
				// an assistant's fresh draft waits for the reviewer on the first one
				reviewDraft: index === 0 ? { by: 'dev-team-reviewer' } : undefined
			}
		});
	});
}
