import { m } from '#lib/paraglide/messages';
import { defineColumns, type ColumnExtras } from '#lib/components/dataGrid/gridColumn';
import { SCHOOLS_COLUMNS, type SchoolRow } from '#lib/dataGrid/tables/schools';

/** A count as the table shows it: nothing to count is a dash. */
const count = (value: number) => (value > 0 ? String(value) : '—');

const countColumn = ({
	label,
	value
}: {
	label: string;
	value: (row: SchoolRow) => number;
}): ColumnExtras<SchoolRow> => ({
	label,
	align: 'center',
	size: 150,
	value,
	text: (row) => count(value(row))
});

/** The schools table's columns: the API's metadata (`SCHOOLS_COLUMNS`) with labels. */
export function schoolColumns() {
	return defineColumns<SchoolRow, (typeof SCHOOLS_COLUMNS)[number]>({
		metas: SCHOOLS_COLUMNS,
		extras: {
			name: { label: m.school(), alwaysVisible: true, size: 260, value: (row) => row.name },
			city: { label: m.city(), value: (row) => row.city, text: (row) => row.city ?? '—' },
			foreign: {
				label: m.schoolIsForeign(),
				align: 'center',
				size: 150,
				value: (row) => row.foreign,
				text: (row) => (row.foreign ? m.yes() : m.no())
			},
			delegations: countColumn({ label: m.delegations(), value: (row) => row.delegations }),
			participants: countColumn({
				label: m.schoolsParticipants(),
				value: (row) => row.participants
			}),
			applied: countColumn({ label: m.schoolsApplied(), value: (row) => row.applied }),
			seated: countColumn({ label: m.schoolsSeated(), value: (row) => row.seated }),
			supervisors: countColumn({ label: m.supervisors(), value: (row) => row.supervisors }),
			waitingList: countColumn({ label: m.waitingList(), value: (row) => row.waitingList })
		}
	});
}
