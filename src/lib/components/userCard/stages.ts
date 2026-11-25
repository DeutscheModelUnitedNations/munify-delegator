import { m } from '#lib/paraglide/messages';
import type { ParticipationStage } from './userCardRoles';

/** How each stage on the way to a seat is shown. */
export const STAGES: Record<
	ParticipationStage,
	{ label: () => string; color: string; icon: string }
> = {
	waitingList: {
		label: () => m.userCardStageWaitingList(),
		color: 'text-info',
		icon: 'ph-clock-countdown'
	},
	registered: {
		label: () => m.userCardStageRegistered(),
		color: 'text-warning',
		icon: 'ph-pencil-line'
	},
	applied: {
		label: () => m.userCardStageApplied(),
		color: 'text-info',
		icon: 'ph-paper-plane-tilt'
	},
	notSeated: {
		label: () => m.userCardStageNotSeated(),
		color: 'text-error',
		icon: 'ph-x-circle'
	}
};

const GENDER_ICONS: Partial<Record<string, string>> = {
	MALE: 'gender-male',
	FEMALE: 'gender-female',
	DIVERSE: 'gender-intersex'
};

const FOOD_ICONS: Partial<Record<string, string>> = { VEGETARIAN: 'carrot', VEGAN: 'leaf' };

/** The Phosphor icon (without the `ph-` prefix) of a stored diet. */
export const foodIcon = (preference: string | null | undefined) =>
	FOOD_ICONS[preference ?? ''] ?? 'fork-knife';

/** The Phosphor icon (without the `ph-` prefix) of a stored gender. */
export const genderIcon = (gender: string | null | undefined) =>
	GENDER_ICONS[gender ?? ''] ?? 'user';
