import { abilityBuilder } from '#api/rumble';
import { PAPER_ROLES, hop } from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { paperOfTeamConference } from '../paper/paperPermissions';

/**
 * The abilities of review drafts. A draft is its reviewer's alone: nobody else reads it, not the
 * conference's project management and not a system admin, since it is unfinished work that only
 * counts once it is sent. Its reviewer reads it while they review the conference's papers
 * (`reviewPapers`), an AI assistant acting for them only in the conference of its tool call, which
 * `paperOfTeamConference` confines it to; that is why the rule takes the session's user rather
 * than `callerUserId`, which an assistant's request leaves empty. Writing goes through the
 * resolvers, which check `assertCanReviewPaper`, as for sending the review.
 */
export function registerPaperReviewDraftAbilities() {
	abilityBuilder.paperReviewDraft.allow(['read', 'update', 'delete']).when(
		liveWhere((args) => {
			const reviewerId = args.ctx.oidc.user?.sub;
			if (!reviewerId) return undefined;
			const paper = paperOfTeamConference({ ...args, roles: PAPER_ROLES });
			return hop(paper, (paper) => ({ reviewerId, paper }));
		})
	);
}
