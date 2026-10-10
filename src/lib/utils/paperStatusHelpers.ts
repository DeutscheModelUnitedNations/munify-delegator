import type { PaperstatusEnum } from '$lib/api/rumbleClient/client';

/**
 * Returns the appropriate DaisyUI badge class for a paper status
 */
export const getStatusBadgeClass = (status: PaperstatusEnum): string => {
	switch (status) {
		case 'SUBMITTED':
			return 'badge-warning';
		case 'REVISED':
			return 'badge-info';
		case 'CHANGES_REQUESTED':
			return 'badge-error';
		case 'ACCEPTED':
			return 'badge-success';
		default:
			return 'badge-ghost';
	}
};
