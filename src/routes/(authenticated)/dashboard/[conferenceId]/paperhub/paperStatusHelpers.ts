import type { PaperstatusEnum } from '#lib/api/rumbleClient/client';

const statusBadgeClasses: Record<PaperstatusEnum, string> = {
	SUBMITTED: 'badge-warning',
	REVISED: 'badge-info',
	CHANGES_REQUESTED: 'badge-error',
	ACCEPTED: 'badge-success',
	DRAFT: 'badge-ghost'
};

/**
 * Returns the appropriate DaisyUI badge class for a paper status
 */
export const getStatusBadgeClass = (status: PaperstatusEnum): string =>
	statusBadgeClasses[status] ?? 'badge-ghost';
