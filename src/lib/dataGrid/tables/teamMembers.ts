import type { ColumnMeta } from '../columnTypes';
import { TEAM_ROLES } from './participants';

/** The team members table's columns as the API and the page share them (see `participants.ts`). */
export const TEAM_MEMBERS_COLUMNS = [
	{ id: 'family_name', type: 'text' },
	{ id: 'given_name', type: 'text' },
	{ id: 'email', type: 'text' },
	{ id: 'phone', type: 'text' },
	{ id: 'role', type: 'enum', options: TEAM_ROLES },
	{ id: 'profileComplete', type: 'boolean' },
	{ id: 'joinedAt', type: 'date' }
] as const satisfies readonly ColumnMeta[];
