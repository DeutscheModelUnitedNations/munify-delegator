import type { Row } from '$api/db/rows';

type PaperStatus = Row<'paper'>['status'];

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
