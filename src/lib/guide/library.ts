/** What state a guide page is in, as the team's workspace (`team/guide`) shows it. */

export type GuidePageState = 'DRAFT' | 'PUBLISHED' | 'CHANGED';

/** Never published, published as it stands, or published with later changes to the draft. */
export function guidePageState({
	publishedAt,
	draftUpdatedAt
}: {
	publishedAt: Date | string | null | undefined;
	draftUpdatedAt: Date | string;
}): GuidePageState {
	if (!publishedAt) return 'DRAFT';
	return new Date(draftUpdatedAt).getTime() > new Date(publishedAt).getTime()
		? 'CHANGED'
		: 'PUBLISHED';
}
