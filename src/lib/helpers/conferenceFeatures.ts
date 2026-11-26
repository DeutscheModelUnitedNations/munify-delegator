/**
 * The conference's feature switches and what each needs before it may be switched on. Shared by
 * the settings page (cards, checked against the form) and `updateConference` (checked on the row as
 * written), so both refuse the same things.
 */

/** The switches, in the order the settings page shows them. */
export const CONFERENCE_FEATURES = [
	'unlockPayments',
	'unlockPostals',
	'isOpenPaperSubmission',
	'showCalendar',
	'messagingEnabled',
	'guidePublished'
] as const;
export type ConferenceFeature = (typeof CONFERENCE_FEATURES)[number];

/** Something a feature needs; one entry per thing the team has to set up somewhere. */
export type FeatureRequirement =
	| 'feeAmount'
	| 'currency'
	| 'bankAccountHolder'
	| 'iban'
	| 'postalAddress'
	| 'postalTemplates'
	| 'agendaItem'
	| 'calendarDay'
	| 'publishedGuide';

/** What the requirements are decided on: conference columns plus facts from other tables. */
export interface ConferenceFeatureFacts {
	feeAmount: number | null | undefined;
	currency: string | null | undefined;
	bankAccountHolder: string | null | undefined;
	iban: string | null | undefined;
	postalName: string | null | undefined;
	postalStreet: string | null | undefined;
	postalZip: string | null | undefined;
	postalCity: string | null | undefined;
	postalCountry: string | null | undefined;
	/** All four postal templates (contract, guardian consent, media consent, terms) are stored. */
	postalTemplates: boolean;
	/** Some committee of the conference has an agenda item. */
	hasAgendaItem: boolean;
	/** The conference's calendar has at least one day. */
	hasCalendarDay: boolean;
	/** The guide's sidebar has been published once. */
	hasPublishedGuide: boolean;
}

export type FeatureSwitches = Record<ConferenceFeature, boolean>;

const filled = (value: string | null | undefined) => !!value?.trim();

/** Each feature's requirements, the unmet ones listed in a fixed order. */
export function missingFeatureRequirements(
	facts: ConferenceFeatureFacts
): Record<ConferenceFeature, FeatureRequirement[]> {
	const unmet = (checks: [FeatureRequirement, boolean][]) =>
		checks.filter(([, met]) => !met).map(([requirement]) => requirement);
	return {
		unlockPayments: unmet([
			['feeAmount', facts.feeAmount != null],
			['currency', filled(facts.currency)],
			['bankAccountHolder', filled(facts.bankAccountHolder)],
			['iban', filled(facts.iban)]
		]),
		unlockPostals: unmet([
			[
				'postalAddress',
				[
					facts.postalName,
					facts.postalStreet,
					facts.postalZip,
					facts.postalCity,
					facts.postalCountry
				].every(filled)
			],
			['postalTemplates', facts.postalTemplates]
		]),
		isOpenPaperSubmission: unmet([['agendaItem', facts.hasAgendaItem]]),
		showCalendar: unmet([['calendarDay', facts.hasCalendarDay]]),
		messagingEnabled: [],
		guidePublished: unmet([['publishedGuide', facts.hasPublishedGuide]])
	};
}

interface FeatureState {
	switches: FeatureSwitches;
	facts: ConferenceFeatureFacts;
}

/**
 * The features a change leaves switched on with a requirement it did not lack before: switched on
 * while something is missing, or something taken away while switched on. A feature that was
 * already on and already lacked the same things passes, so a conference set up before these rules
 * still saves its other settings; turning a feature off always passes.
 */
export function newlyUnmetFeatures({
	before,
	after
}: {
	before: FeatureState;
	after: FeatureState;
}): { feature: ConferenceFeature; missing: FeatureRequirement[] }[] {
	const missingBefore = missingFeatureRequirements(before.facts);
	const missingAfter = missingFeatureRequirements(after.facts);
	return CONFERENCE_FEATURES.flatMap((feature) => {
		const missing = missingAfter[feature];
		if (!after.switches[feature] || missing.length === 0) return [];
		const tolerated =
			before.switches[feature] &&
			missing.every((requirement) => missingBefore[feature].includes(requirement));
		return tolerated ? [] : [{ feature, missing }];
	});
}
