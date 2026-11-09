/**
 * The tables the backend searches, filters, sorts and groups (`#api/handlers/dataTable`), which
 * are also the tables views can be saved for. Stable: they name stored views.
 */
export const DATA_TABLE_KEYS = ['participants', 'waitingList', 'teamMembers', 'schools'] as const;

export type DataTableKey = (typeof DATA_TABLE_KEYS)[number];
