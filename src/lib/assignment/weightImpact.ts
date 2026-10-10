import type { AssignmentWeights } from './autoAssign';

export type ImpactTone = 'good' | 'bad' | 'neutral';

export type ImpactSubject =
	'ratings' | 'aboveAverage' | 'belowAverage' | 'flagged' | 'experienced' | 'newcomers';

export type ImpactEffect =
	| 'seatedFirst'
	| 'leftOutFirst'
	| 'wishesWeighMore'
	| 'wishesWeighLess'
	| 'winContested'
	| 'loseContested'
	| 'noEffect'
	| 'noRoleEffect';

export interface Impact {
	subject: ImpactSubject;
	/** The rating the subject is measured against, for the rating subjects. */
	rating?: number;
	effects: { effect: ImpactEffect; tone: ImpactTone }[];
}

type Effect = Impact['effects'][number];

const NO_EFFECT: Impact['effects'] = [{ effect: 'noEffect', tone: 'neutral' }];

/** Seated or left out first, and (when it reaches contested roles) wishes weighing more or less. */
function favourEffects(favoured: boolean, reachesWishes: boolean): Effect[] {
	const seating: Effect = favoured
		? { effect: 'seatedFirst', tone: 'good' }
		: { effect: 'leftOutFirst', tone: 'bad' };
	const wishes: Effect = reachesWishes
		? favoured
			? { effect: 'wishesWeighMore', tone: 'good' }
			: { effect: 'wishesWeighLess', tone: 'bad' }
		: { effect: 'noRoleEffect', tone: 'neutral' };
	return [seating, wishes];
}

function ratingImpacts(weights: AssignmentWeights): Impact[] {
	if (weights.ratingFactor === 0) return [{ subject: 'ratings', effects: NO_EFFECT }];
	return [
		{
			subject: 'aboveAverage',
			rating: weights.nullRating,
			effects: [
				{ effect: 'seatedFirst', tone: 'good' },
				{ effect: 'wishesWeighMore', tone: 'good' }
			]
		},
		{
			subject: 'belowAverage',
			rating: weights.nullRating,
			effects: [
				{ effect: 'leftOutFirst', tone: 'bad' },
				{ effect: 'wishesWeighLess', tone: 'bad' }
			]
		}
	];
}

function markImpacts(weights: AssignmentWeights): Impact[] {
	if (weights.markBonus === 0) return [{ subject: 'flagged', effects: NO_EFFECT }];
	return [
		{
			subject: 'flagged',
			effects: favourEffects(weights.markBonus > 0, weights.markEffect === 'WISHES_AND_SEATING')
		}
	];
}

function experienceImpacts(weights: AssignmentWeights): Impact[] {
	const modifier = weights.experienceModifier;
	if (modifier === 0) return [{ subject: 'experienced', effects: NO_EFFECT }];
	const favoured = modifier < 0;
	const contested = weights.experienceEffect === 'WISHES_AND_SEATING';
	const newcomerSeating: Effect = favoured
		? { effect: 'leftOutFirst', tone: 'bad' }
		: { effect: 'seatedFirst', tone: 'good' };
	const newcomerContested: Effect[] = !contested
		? []
		: favoured
			? [{ effect: 'loseContested', tone: 'bad' }]
			: [{ effect: 'winContested', tone: 'good' }];
	return [
		{
			subject: 'experienced',
			effects: favourEffects(favoured, contested)
		},
		{ subject: 'newcomers', effects: [newcomerSeating, ...newcomerContested] }
	];
}

/**
 * What the weights will do, as structured sentences for the weighing page to put into words:
 * who ends up better or worse off, and whether a contested role or only the seating is affected.
 */
export function weightImpacts(weights: AssignmentWeights): Impact[] {
	return [...ratingImpacts(weights), ...markImpacts(weights), ...experienceImpacts(weights)];
}
