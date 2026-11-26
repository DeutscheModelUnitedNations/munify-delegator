import { m } from '#lib/paraglide/messages';
import type { ConferenceFeature, FeatureRequirement } from './conferenceFeatures';

/** The feature switches' names, as the settings cards and the API's refusals call them. */
const FEATURE_LABELS: Record<ConferenceFeature, () => string> = {
	unlockPayments: m.featurePayments,
	unlockPostals: m.featurePostals,
	isOpenPaperSubmission: m.featurePaperSubmission,
	showCalendar: m.featureCalendar,
	messagingEnabled: m.featureMessaging,
	groupChatsEnabled: m.featureGroupChats,
	guidePublished: m.featureGuide
};

const REQUIREMENT_LABELS: Record<FeatureRequirement, () => string> = {
	feeAmount: m.featureRequirementFeeAmount,
	currency: m.featureRequirementCurrency,
	bankAccountHolder: m.featureRequirementBankAccountHolder,
	iban: m.featureRequirementIban,
	postalAddress: m.featureRequirementPostalAddress,
	postalTemplates: m.featureRequirementPostalTemplates,
	agendaItem: m.featureRequirementAgendaItem,
	calendarDay: m.featureRequirementCalendarDay,
	publishedGuide: m.featureRequirementPublishedGuide
};

export const featureLabel = (feature: ConferenceFeature) => FEATURE_LABELS[feature]();

export const featureRequirementLabel = (requirement: FeatureRequirement) =>
	REQUIREMENT_LABELS[requirement]();
