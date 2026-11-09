import { m } from '#lib/paraglide/messages';
import type { McpcalloutcomeEnum } from '#lib/api/rumbleClient/client';

/** How the AI access log shows how a call ended. */
export function auditOutcomeBadge(outcome: McpcalloutcomeEnum) {
	switch (outcome) {
		case 'OK':
			return { class: 'badge-success', label: () => m.aiAccessOutcomeOk() };
		case 'REFUSED':
			return { class: 'badge-warning', label: () => m.aiAccessOutcomeRefused() };
		case 'ERROR':
			return { class: 'badge-error', label: () => m.aiAccessOutcomeError() };
	}
}

/** A call's arguments in one line; the GraphQL of a query tool as it was sent. */
export function formatAuditArguments(args: unknown) {
	if (args === null || args === undefined) return '';
	const text = JSON.stringify(args);
	return text === '{}' ? '' : text;
}
