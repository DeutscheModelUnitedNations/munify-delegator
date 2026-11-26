import { describe, expect, test } from 'vitest';
import {
	missingFeatureRequirements,
	newlyUnmetFeatures,
	type ConferenceFeatureFacts,
	type FeatureSwitches
} from './conferenceFeatures';

const complete: ConferenceFeatureFacts = {
	feeAmount: 75,
	currency: 'EUR',
	bankAccountHolder: 'DMUN e.V.',
	iban: 'DE89370400440532013000',
	postalName: 'DMUN e.V.',
	postalStreet: 'Straße 1',
	postalZip: '12345',
	postalCity: 'Berlin',
	postalCountry: 'Deutschland',
	postalTemplates: true,
	hasAgendaItem: true,
	hasCalendarDay: true,
	hasPublishedGuide: true
};

const empty: ConferenceFeatureFacts = {
	feeAmount: null,
	currency: undefined,
	bankAccountHolder: '',
	iban: '  ',
	postalName: null,
	postalStreet: null,
	postalZip: null,
	postalCity: null,
	postalCountry: null,
	postalTemplates: false,
	hasAgendaItem: false,
	hasCalendarDay: false,
	hasPublishedGuide: false
};

const off: FeatureSwitches = {
	unlockPayments: false,
	unlockPostals: false,
	isOpenPaperSubmission: false,
	showCalendar: false,
	messagingEnabled: false,
	groupChatsEnabled: false,
	guidePublished: false
};
const on: FeatureSwitches = {
	unlockPayments: true,
	unlockPostals: true,
	isOpenPaperSubmission: true,
	showCalendar: true,
	messagingEnabled: true,
	groupChatsEnabled: true,
	guidePublished: true
};

describe('missingFeatureRequirements', () => {
	test('a fully set up conference lacks nothing', () => {
		expect(Object.values(missingFeatureRequirements(complete)).flat()).toEqual([]);
	});

	test('lists every unmet requirement; blank text counts as missing', () => {
		expect(missingFeatureRequirements(empty)).toEqual({
			unlockPayments: ['feeAmount', 'currency', 'bankAccountHolder', 'iban'],
			unlockPostals: ['postalAddress', 'postalTemplates'],
			isOpenPaperSubmission: ['agendaItem'],
			showCalendar: ['calendarDay'],
			messagingEnabled: [],
			groupChatsEnabled: [],
			guidePublished: ['publishedGuide']
		});
	});

	test('a fee of zero is set; the postal address needs every line', () => {
		const missing = missingFeatureRequirements({ ...complete, feeAmount: 0, postalZip: '' });
		expect(missing.unlockPayments).toEqual([]);
		expect(missing.unlockPostals).toEqual(['postalAddress']);
	});
});

describe('newlyUnmetFeatures', () => {
	test('refuses switching a feature on while something is missing', () => {
		expect(
			newlyUnmetFeatures({
				before: { switches: off, facts: { ...complete, iban: null } },
				after: { switches: { ...off, unlockPayments: true }, facts: { ...complete, iban: null } }
			})
		).toEqual([{ feature: 'unlockPayments', missing: ['iban'] }]);
	});

	test('refuses taking a requirement away from a feature that is on', () => {
		expect(
			newlyUnmetFeatures({
				before: { switches: on, facts: complete },
				after: { switches: on, facts: { ...complete, postalTemplates: false } }
			})
		).toEqual([{ feature: 'unlockPostals', missing: ['postalTemplates'] }]);
	});

	test('setting up and switching on in one change passes', () => {
		expect(
			newlyUnmetFeatures({
				before: { switches: off, facts: empty },
				after: { switches: on, facts: complete }
			})
		).toEqual([]);
	});

	test('a feature already on and already lacking passes, also when partly fixed', () => {
		expect(
			newlyUnmetFeatures({
				before: { switches: on, facts: empty },
				after: { switches: on, facts: { ...empty, iban: 'DE89370400440532013000' } }
			})
		).toEqual([]);
	});

	test('turning a feature off always passes; messaging needs nothing', () => {
		expect(
			newlyUnmetFeatures({
				before: { switches: on, facts: complete },
				after: { switches: { ...off, messagingEnabled: true }, facts: empty }
			})
		).toEqual([]);
	});
});
