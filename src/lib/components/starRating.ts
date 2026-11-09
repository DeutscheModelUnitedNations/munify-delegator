/**
 * What clicking the star at `position` (1 to 5) sets: that many stars, or half a star less when
 * the rating already is that many, so a second click on the last full star halves it.
 */
export function starTarget({ rating, position }: { rating: number; position: number }): number {
	return rating === position ? position - 0.5 : position;
}
