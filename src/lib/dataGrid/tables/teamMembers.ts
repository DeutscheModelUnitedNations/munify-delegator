import type { ColumnMeta } from '../columnTypes';
import { TEAM_ROLES } from './participants';

/** The team members table's columns as the API and the page share them (see `participants.ts`). */
export const TEAM_MEMBERS_COLUMNS = [
	{ id: 'family_name', type: 'text', groupable: false },
	{ id: 'given_name', type: 'text', groupable: false },
	{ id: 'email', type: 'text', groupable: false },
	{ id: 'phone', type: 'text', groupable: false },
	{ id: 'role', type: 'enum', options: TEAM_ROLES },
	{ id: 'profileComplete', type: 'boolean' },
	{ id: 'joinedAt', type: 'date' }
] as const satisfies readonly ColumnMeta[];
