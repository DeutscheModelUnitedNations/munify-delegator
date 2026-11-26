import type {
	AdministrativestatusEnum,
	MediaconsentstatusEnum
} from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import type { FormalityKey } from '../formalities';
import type { StatusOption } from '../ui/StateMenu.svelte';

/** What each formality is called and its icon. Functions, so the labels follow the locale. */
export const FORMALITY_META: Record<FormalityKey, { icon: string; title: () => string }> = {
	paymentStatus: { icon: 'money', title: () => m.payment() },
	termsAndConditions: { icon: 'signature', title: () => m.userAgreement() },
	guardianConsent: { icon: 'shield-check', title: () => m.guardianAgreement() },
	mediaConsent: { icon: 'camera', title: () => m.mediaAgreement() },
	mediaConsentStatus: { icon: 'camera-slash', title: () => m.mediaConsentStatus() }
};

export const administrativeOptions = (): StatusOption<AdministrativestatusEnum>[] => [
	{ value: 'PENDING', label: m.statusPending(), icon: 'hourglass-medium', tone: 'warning' },
	{ value: 'PROBLEM', label: m.statusProblem(), icon: 'warning', tone: 'error' },
	{
		value: 'NEEDS_HUMAN_REVIEW',
		label: m.statusNeedsHumanReview(),
		icon: 'magnifying-glass',
		tone: 'warning'
	},
	{ value: 'DONE', label: m.statusDone(), icon: 'check-circle', tone: 'success' }
];

/** What is allowed is neither good nor bad, only not knowing it is open. */
export const mediaConsentOptions = (): StatusOption<MediaconsentstatusEnum>[] => [
	{
		value: 'NOT_SET',
		label: m.mediaConsentStatusNotSet(),
		short: m.userCardMediaNotSet(),
		icon: 'clipboard',
		tone: 'warning'
	},
	{
		value: 'NOT_ALLOWED',
		label: m.mediaConsentStatusNotAllowed(),
		short: m.userCardMediaNotAllowed(),
		icon: 'camera-slash',
		tone: 'neutral'
	},
	{
		value: 'PARTIALLY_ALLOWED',
		label: m.mediaConsentStatusPartiallyAllowed(),
		short: m.userCardMediaPartially(),
		icon: 'magnifying-glass',
		tone: 'neutral'
	},
	{
		value: 'ALLOWED_ALL',
		label: m.mediaConsentStatusAllowedAll(),
		short: m.userCardMediaAllowed(),
		icon: 'camera',
		tone: 'neutral'
	}
];
