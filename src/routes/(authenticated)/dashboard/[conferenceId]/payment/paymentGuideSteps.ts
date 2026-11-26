import { m } from '#lib/paraglide/messages';
import type { GuideStep } from '#lib/components/postalGuide/steps';
import { SCENE_MS } from '#lib/components/postalGuide/timing';
import Reference from './scenes/Reference.svelte';

/**
 * What the payment guide goes through, from the reference to the money arriving. Its scenes are
 * still to be drawn: each step shows its icon until then (`ScenePlaceholder`), and `plannedScene`
 * says what its animation is to show, the mistake and then the right way, like the postal guide's.
 */
export const PAYMENT_GUIDE_STEPS: readonly (GuideStep & { plannedScene?: string })[] = [
	{
		id: 'reference',
		scene: Reference,
		title: m.paymentGuideReferenceTitle,
		text: m.paymentGuideReferenceText,
		warning: m.paymentGuideReferenceWarning,
		done: [{ icon: 'textbox', text: m.paymentGuideDoneReference }]
	},
	{
		id: 'one-transfer',
		icon: 'arrows-in-simple',
		plannedScene:
			'The amount falls apart into three small transfers that drift away; then one envelope, one amount, one reference.',
		title: m.paymentGuideOneTransferTitle,
		text: m.paymentGuideOneTransferText,
		done: [{ icon: 'arrows-in-simple', text: m.paymentGuideDoneOneTransfer }]
	},
	{
		id: 'amount',
		icon: 'scales',
		plannedScene:
			'A balance: the reference with its amount on one side, the transfer on the other; too little tips it, the exact amount levels it.',
		title: m.paymentGuideAmountTitle,
		text: m.paymentGuideAmountText,
		done: [{ icon: 'scales', text: m.paymentGuideDoneAmount }]
	},
	{
		id: 'fees',
		icon: 'globe-hemisphere-west',
		plannedScene:
			'On the way a bank nibbles a part off and less arrives; with "OUR" the whole amount arrives.',
		title: m.paymentGuideFeesTitle,
		text: m.paymentGuideFeesText,
		warning: m.paymentGuideFeesWarning,
		important: true,
		done: [{ icon: 'globe-hemisphere-west', text: m.paymentGuideDoneFees }]
	},
	{
		id: 'transfer-only',
		icon: 'bank',
		plannedScene:
			'A banknote, a phone with a payment app and a cheque are struck through one after the other; the transfer form stays.',
		title: m.paymentGuideTransferOnlyTitle,
		text: m.paymentGuideTransferOnlyText,
		done: [{ icon: 'money', text: m.paymentGuideDoneTransferOnly, dont: true }]
	},
	{
		id: 'any-account',
		icon: 'users-three',
		plannedScene:
			'Three accounts with different names send money one after the other; all carry the same reference and land on the right pile.',
		title: m.paymentGuideAnyAccountTitle,
		text: m.paymentGuideAnyAccountText,
		done: [{ icon: 'users-three', text: m.paymentGuideDoneAnyAccount }]
	},
	{
		id: 'girocode',
		icon: 'qr-code',
		plannedScene:
			'A phone passes over the GiroCode and the fields of the transfer fill themselves; beside it a typed IBAN with swapped digits flashes.',
		title: m.paymentGuideGiroCodeTitle,
		text: m.paymentGuideGiroCodeText,
		done: [{ icon: 'qr-code', text: m.paymentGuideDoneGiroCode }]
	},
	{
		id: 'patience',
		icon: 'hourglass-medium',
		plannedScene:
			'Calendar leaves fall calmly; the badge turns from "open" over "on its way" to "received".',
		title: m.paymentGuidePatienceTitle,
		text: m.paymentGuidePatienceText,
		done: [{ icon: 'hourglass-medium', text: m.paymentGuideDonePatience }]
	}
];

export const PAYMENT_GUIDE_DURATIONS = PAYMENT_GUIDE_STEPS.map(() => SCENE_MS);
