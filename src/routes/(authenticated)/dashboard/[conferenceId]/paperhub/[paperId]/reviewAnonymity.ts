import type { PaperreviewanonymousasEnum } from '#lib/api/rumbleClient/client';
import { PAPER_REVIEW_ANONYMOUS_AS, reviewSignature } from '#lib/utils/enumTranslations';

/** The longest name a review can be published under; the API refuses more. */
export const REVIEW_ANONYMOUS_NAME_MAX = 80;

/** The reviewer's remembered choice: publish anonymously or not, under which name, the typed one. */
export interface ReviewAnonymity {
	anonymous: boolean;
	as: PaperreviewanonymousasEnum;
	/** Used with `as: CUSTOM`. */
	name: string;
}

export const DEFAULT_REVIEW_ANONYMITY: ReviewAnonymity = {
	anonymous: false,
	as: 'SECRETARIAT',
	name: ''
};

const isAnonymousAs = (value: unknown): value is PaperreviewanonymousasEnum =>
	PAPER_REVIEW_ANONYMOUS_AS.some((option) => option === value);

/** The stored choice, or its parts' defaults where storage holds something else. */
export function storedReviewAnonymity(stored: unknown): ReviewAnonymity {
	if (typeof stored !== 'object' || stored === null) return DEFAULT_REVIEW_ANONYMITY;
	const anonymous = 'anonymous' in stored && stored.anonymous === true;
	const as = 'as' in stored && isAnonymousAs(stored.as) ? stored.as : DEFAULT_REVIEW_ANONYMITY.as;
	const name = 'name' in stored && typeof stored.name === 'string' ? stored.name : '';
	return { anonymous, as, name };
}

const typedName = (choice: ReviewAnonymity) => choice.name.trim();

/** Whether the choice can be sent: a custom name must be filled in and short enough. */
export function reviewAnonymityComplete(choice: ReviewAnonymity) {
	if (!choice.anonymous || choice.as !== 'CUSTOM') return true;
	const name = typedName(choice);
	return name.length > 0 && name.length <= REVIEW_ANONYMOUS_NAME_MAX;
}

/** The name the author will read, or nothing when the review is signed by name. */
export function reviewAnonymityName(choice: ReviewAnonymity) {
	if (!choice.anonymous) return undefined;
	return reviewSignature({ anonymousAs: choice.as, anonymousName: typedName(choice) });
}

/** What `createPaperReview` takes: the name to publish under, or nothing to sign by name. */
export function anonymityArgs(choice: ReviewAnonymity) {
	if (!choice.anonymous) return { anonymousAs: undefined, anonymousName: undefined };
	return {
		anonymousAs: choice.as,
		anonymousName: choice.as === 'CUSTOM' ? typedName(choice) : undefined
	};
}
