import { m } from '#lib/paraglide/messages';
import type { Visibility } from '#lib/guide/workspace';

/** How a cell of the visibility table reads: an icon, its meaning and its look. */
export const VISIBILITY_CELL: Record<
	Visibility,
	{ icon: string; label: () => string; look: string }
> = {
	all: { icon: 'ph-fill ph-check-circle', label: () => m.guideSeesAll(), look: 'text-success' },
	some: { icon: 'ph-duotone ph-circle-half', label: () => m.guideSeesSome(), look: '' },
	own: { icon: 'ph-duotone ph-users-three', label: () => m.guideSeesOwnCommittee(), look: '' },
	none: { icon: 'ph-duotone ph-minus', label: () => m.guideSeesNothing(), look: 'opacity-50' }
};
