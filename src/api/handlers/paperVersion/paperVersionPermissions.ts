import { sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '#api/db/schema/index';
import { abilityBuilder } from '#api/rumble';
import {
	PAPER_ROLES,
	idIn,
	linkedChase,
	RELEASED_MIRRORED_CONFERENCE,
	systemAdmin,
	hop
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { liveRule, liveWhere } from '#api/services/authHelper/callerFacts';
import {
	paperOfTeamConference,
	submittedPaperOfOwnDelegation,
	submittedPaperOfSeatConference,
	submittedPaperOfSupervisedDelegation
} from '../paper/paperPermissions';

/**
 * The abilities of paper versions, which follow what the reader may read of the paper. Versions
 * are written by `createPaper` / `updatePaper` and `createPaperReview`, never through an ability.
 */
export function registerPaperVersionAbilities() {
	abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

	// The accepted versions of working papers, for the linked CHASE's drafts.
	abilityBuilder.paperVersion.allow('read').when(
		linkedChase({
			where: {
				status: 'ACCEPTED' as const,
				paper: {
					type: 'WORKING_PAPER' as const,
					delegation: { conference: RELEASED_MIRRORED_CONFERENCE }
				}
			},
			columns: { id: true, paperId: true, version: true, content: true, status: true }
		})
	);

	// Authors read every version of their own papers, drafts included.
	abilityBuilder.paperVersion
		.allow('read')
		.when(
			liveWhere(({ ctx, facts }) =>
				callerUserId(ctx)
					? { paperId: idIn(facts.authoredPapers.map((paper) => paper.id)) }
					: undefined
			)
		);

	// The paper team (`reviewPapers`: reviewer, project management, participant care, team
	// coordinator, content lead) reads every version of the conference's papers.
	abilityBuilder.paperVersion.allow('read').when(
		liveWhere((args) => {
			const paper = paperOfTeamConference({ ...args, roles: PAPER_ROLES });
			return hop(paper, (paper) => ({ paper }));
		})
	);

	// Supervisors of the delegation, and its delegates (the second rule), read the submitted
	// versions of its submitted papers, never a draft - what they may read of the paper itself.
	abilityBuilder.paperVersion.allow('read').when(
		liveWhere((args) => {
			const paper = submittedPaperOfSupervisedDelegation(args);
			return hop(paper, (paper) => ({ status: { ne: 'DRAFT' as const }, paper }));
		})
	);
	abilityBuilder.paperVersion.allow('read').when(
		liveWhere((args) => {
			const paper = submittedPaperOfOwnDelegation(args);
			return hop(paper, (paper) => ({ status: { ne: 'DRAFT' as const }, paper }));
		})
	);

	// Everybody with a seat in the conference reads its submitted papers as they stand: the latest
	// submitted version only, without its status (the reviewers' verdict). Earlier versions stay
	// with the author, the delegation, its supervisors and the paper team.
	abilityBuilder.paperVersion.allow('read').when(
		liveRule((args) => {
			const paper = submittedPaperOfSeatConference(args);
			const where = hop(paper, (paper) => ({
				status: { ne: 'DRAFT' as const },
				paper,
				RAW: isLatestSubmittedVersion
			}));
			return where && { where, columns: { status: false } };
		})
	);
}

const laterVersion = alias(schema.paperVersion, 'later_version');

/** Matches a version no later submitted (non-draft) version of the same paper follows. */
export function isLatestSubmittedVersion(version: typeof schema.paperVersion) {
	return sql`not exists (select 1 from ${schema.paperVersion} as ${laterVersion} where ${laterVersion.paperId} = ${version.paperId} and ${laterVersion.status} <> 'DRAFT' and ${laterVersion.version} > ${version.version})`;
}
