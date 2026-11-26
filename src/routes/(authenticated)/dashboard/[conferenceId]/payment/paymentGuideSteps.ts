import { m } from '#lib/paraglide/messages';
import type { GuideStep } from '#lib/components/postalGuide/steps';
import { SCENE_MS } from '#lib/components/postalGuide/timing';
import Amount from './scenes/Amount.svelte';
import AnyAccount from './scenes/AnyAccount.svelte';
import Fees from './scenes/Fees.svelte';
import GiroCode from './scenes/GiroCode.svelte';
import OneTransfer from './scenes/OneTransfer.svelte';
import Patience from './scenes/Patience.svelte';
import Reference from './scenes/Reference.svelte';
import TransferOnly from './scenes/TransferOnly.svelte';

/**
 * What the payment guide goes through, from the reference to the money arriving: like the postal
 * guide's, each scene shows the mistake and then the right way, at a bank instead of a scanner.
 */
export const PAYMENT_GUIDE_STEPS: readonly GuideStep[] = [
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
		scene: OneTransfer,
		title: m.paymentGuideOneTransferTitle,
		text: m.paymentGuideOneTransferText,
		done: [{ icon: 'arrows-in-simple', text: m.paymentGuideDoneOneTransfer }]
	},
	{
		id: 'amount',
		scene: Amount,
		title: m.paymentGuideAmountTitle,
		text: m.paymentGuideAmountText,
		done: [{ icon: 'scales', text: m.paymentGuideDoneAmount }]
	},
	{
		id: 'fees',
		scene: Fees,
		title: m.paymentGuideFeesTitle,
		text: m.paymentGuideFeesText,
		warning: m.paymentGuideFeesWarning,
		important: true,
		done: [{ icon: 'globe-hemisphere-west', text: m.paymentGuideDoneFees }]
	},
	{
		id: 'transfer-only',
		scene: TransferOnly,
		title: m.paymentGuideTransferOnlyTitle,
		text: m.paymentGuideTransferOnlyText,
		done: [{ icon: 'money', text: m.paymentGuideDoneTransferOnly, dont: true }]
	},
	{
		id: 'any-account',
		scene: AnyAccount,
		title: m.paymentGuideAnyAccountTitle,
		text: m.paymentGuideAnyAccountText,
		done: [{ icon: 'users-three', text: m.paymentGuideDoneAnyAccount }]
	},
	{
		id: 'girocode',
		scene: GiroCode,
		title: m.paymentGuideGiroCodeTitle,
		text: m.paymentGuideGiroCodeText,
		done: [{ icon: 'qr-code', text: m.paymentGuideDoneGiroCode }]
	},
	{
		id: 'patience',
		scene: Patience,
		title: m.paymentGuidePatienceTitle,
		text: m.paymentGuidePatienceText,
		done: [{ icon: 'hourglass-medium', text: m.paymentGuideDonePatience }]
	}
];

export const PAYMENT_GUIDE_DURATIONS = PAYMENT_GUIDE_STEPS.map(() => SCENE_MS);
