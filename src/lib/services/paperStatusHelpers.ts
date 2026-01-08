import type { PaperStatus$options } from '$houdini';

/**
 * Returns the appropriate DaisyUI badge class for a paper status
 */
export const getStatusBadgeClass = (status: PaperStatus$options): string => {
	switch (status) {
		case 'SUBMITTED':
			return 'badge-warning';
		case 'CHANGES_REQUESTED':
			return 'badge-error';
		case 'ACCEPTED':
			return 'badge-success';
		default:
			return 'badge-ghost';
	}
};
