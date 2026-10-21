import { client } from '#lib/api/rumbleClient/client.js';
import type { TableState } from '#lib/components/tanStackTable/tableState.svelte.js';

/** The columns the backend sorts the schools by (`conferenceSchools`). */
const SORT_COLUMNS = [
	'name',
	'city',
	'delegations',
	'participants',
	'applied',
	'seated',
	'supervisors',
	'waitingList'
] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];

const isSortColumn = (id: string): id is SortColumn => SORT_COLUMNS.some((column) => column === id);

const rowFields = {
	schoolId: true,
	name: true,
	city: true,
	delegations: true,
	participants: true,
	applied: true,
	seated: true,
	supervisors: true,
	waitingList: true
} as const;

/** The order the table asks for, as the backend takes it: the first sorted column it knows. */
function schoolsOrder(state: Pick<TableState, 'sorting'>) {
	const sorted = state.sorting.find(({ id }) => isSortColumn(id));
	return sorted && isSortColumn(sorted.id)
		? { sortColumn: sorted.id, sortDesc: sorted.desc }
		: { sortColumn: 'participants' as const, sortDesc: true };
}

function fetchSchools(
	conferenceId: string,
	state: Pick<TableState, 'search' | 'sorting'>,
	paging: { limit: number; offset: number }
) {
	return client.query.conferenceSchools({
		__args: { conferenceId, search: state.search || undefined, ...schoolsOrder(state), ...paging },
		rows: rowFields,
		hasMore: true,
		total: true
	});
}

/** One page of the conference's schools, as the table's search, sorting and paging ask. */
export function fetchSchoolsPage(conferenceId: string, state: TableState) {
	const { pageIndex, pageSize } = state.pagination;
	return fetchSchools(conferenceId, state, { limit: pageSize, offset: pageIndex * pageSize });
}

export type SchoolRow = Awaited<ReturnType<typeof fetchSchoolsPage>>['rows'][number];

/** Every school the search matches, a backend page at a time (for the export). */
export async function fetchAllSchools(conferenceId: string, state: TableState) {
	const all: SchoolRow[] = [];
	const limit = 500;
	for (let offset = 0; ; offset += limit) {
		const page = await fetchSchools(conferenceId, state, { limit, offset });
		all.push(...page.rows);
		if (!page.hasMore) return all;
	}
}
