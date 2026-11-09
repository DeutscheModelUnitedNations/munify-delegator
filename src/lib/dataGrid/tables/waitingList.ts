import type { ColumnMeta } from '../columnTypes';

/** The waiting list's columns as the API and the page share them (see `participants.ts`). */
export const WAITING_LIST_COLUMNS = [
	{ id: 'position', type: 'number', groupable: false },
	{ id: 'createdAt', type: 'date' },
	{ id: 'assignedAt', type: 'date' },
	{ id: 'seated', type: 'boolean' },
	{ id: 'family_name', type: 'text', groupable: false },
	{ id: 'given_name', type: 'text', groupable: false },
	{ id: 'email', type: 'text', groupable: false },
	{ id: 'phone', type: 'text', groupable: false },
	{ id: 'birthday', type: 'date' },
	{ id: 'conferenceAge', type: 'number' },
	{ id: 'participationCount', type: 'number' },
	{ id: 'city', type: 'text' },
	{ id: 'school', type: 'text' },
	{ id: 'motivation', type: 'text', groupable: false },
	{ id: 'experience', type: 'text', groupable: false },
	{ id: 'requests', type: 'text', groupable: false },
	{ id: 'hidden', type: 'boolean' }
] as const satisfies readonly ColumnMeta[];
