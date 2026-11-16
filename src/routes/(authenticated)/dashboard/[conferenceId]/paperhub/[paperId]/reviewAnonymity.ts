import type { PaperreviewanonymousasEnum } from '#lib/api/rumbleClient/client';
import { PAPER_REVIEW_ANONYMOUS_AS } from '#lib/utils/enumTranslations';

/** The reviewer's remembered choice: publish anonymously or not, and under which team name. */
export interface ReviewAnonymity {
	anonymous: boolean;
	as: PaperreviewanonymousasEnum;
}

export const DEFAULT_REVIEW_ANONYMITY: ReviewAnonymity = { anonymous: false, as: 'SECRETARIAT' };

const isAnonymousAs = (value: unknown): value is PaperreviewanonymousasEnum =>
	PAPER_REVIEW_ANONYMOUS_AS.some((option) => option === value);

/** The stored choice, or its parts' defaults where storage holds something else. */
export function storedReviewAnonymity(stored: unknown): ReviewAnonymity {
	if (typeof stored !== 'object' || stored === null) return DEFAULT_REVIEW_ANONYMITY;
	const anonymous = 'anonymous' in stored && stored.anonymous === true;
	const as = 'as' in stored && isAnonymousAs(stored.as) ? stored.as : DEFAULT_REVIEW_ANONYMITY.as;
	return { anonymous, as };
}

/** What `createPaperReview` takes: the team name, or nothing to sign by name. */
export const anonymousAsArg = (choice: ReviewAnonymity) =>
	choice.anonymous ? choice.as : undefined;
