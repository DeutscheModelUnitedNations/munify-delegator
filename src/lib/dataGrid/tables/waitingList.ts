import type { ColumnMeta } from '../columnTypes';

/** The waiting list's columns as the API and the page share them (see `participants.ts`). */
export const WAITING_LIST_COLUMNS = [
	{ id: 'position', type: 'number' },
	{ id: 'createdAt', type: 'date' },
	{ id: 'assignedAt', type: 'date' },
	{ id: 'seated', type: 'boolean' },
	{ id: 'family_name', type: 'text' },
	{ id: 'given_name', type: 'text' },
	{ id: 'email', type: 'text' },
	{ id: 'phone', type: 'text' },
	{ id: 'birthday', type: 'date' },
	{ id: 'conferenceAge', type: 'number' },
	{ id: 'participationCount', type: 'number' },
	{ id: 'city', type: 'text' },
	{ id: 'school', type: 'text' },
	{ id: 'motivation', type: 'text' },
	{ id: 'experience', type: 'text' },
	{ id: 'requests', type: 'text' },
	{ id: 'hidden', type: 'boolean' }
] as const satisfies readonly ColumnMeta[];
