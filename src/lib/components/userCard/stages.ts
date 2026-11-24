import { m } from '#lib/paraglide/messages';
import type { ParticipationStage } from './userCardRoles';

/** How each stage a person has come to is shown. */
export const STAGES: Record<
	ParticipationStage,
	{ label: () => string; badge: string; icon: string }
> = {
	waitingList: {
		label: () => m.userCardStageWaitingList(),
		badge: 'badge-info',
		icon: 'ph-clock-countdown'
	},
	registered: {
		label: () => m.userCardStageRegistered(),
		badge: 'badge-warning',
		icon: 'ph-pencil-line'
	},
	applied: {
		label: () => m.userCardStageApplied(),
		badge: 'badge-info',
		icon: 'ph-paper-plane-tilt'
	},
	notSeated: {
		label: () => m.userCardStageNotSeated(),
		badge: 'badge-error',
		icon: 'ph-x-circle'
	},
	seated: {
		label: () => m.userCardStageSeated(),
		badge: 'badge-success',
		icon: 'ph-chair'
	},
	attended: {
		label: () => m.userCardStageAttended(),
		badge: 'badge-success',
		icon: 'ph-calendar-check'
	}
};

const GENDER_ICONS: Partial<Record<string, string>> = {
	MALE: 'gender-male',
	FEMALE: 'gender-female',
	DIVERSE: 'gender-intersex'
};

/** The Phosphor icon (without the `ph-` prefix) of a stored gender. */
export const genderIcon = (gender: string | null | undefined) =>
	GENDER_ICONS[gender ?? ''] ?? 'user';
