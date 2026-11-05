import { getLocale } from '#lib/paraglide/runtime';
import { m } from '#lib/paraglide/messages';
import { dateBucketOf } from '#lib/dataGrid/grouping';
import type { GroupBy } from '#lib/dataGrid/stateSchema';
import { formatValue, type GridColumn } from '../gridColumn';

/**
 * How a group reads in its header: an enum's label, yes or no, a day, a month or a year in the
 * reader's language, a range of numbers ("10–19"), and "(empty)" for the rows without a value.
 */
type Label = <Row>(args: { column: GridColumn<Row>; groupBy: GroupBy; value: string }) => string;

const number = (value: number) => value.toLocaleString(getLocale());

function dateLabel({ groupBy, value }: { groupBy: GroupBy; value: string }) {
	const bucket = dateBucketOf(groupBy);
	if (bucket === 'year') return value;
	const date = new Date(`${bucket === 'month' ? `${value}-01` : value}T00:00:00`);
	const options: Intl.DateTimeFormatOptions =
		bucket === 'month' ? { month: 'long', year: 'numeric' } : { dateStyle: 'medium' };
	return new Intl.DateTimeFormat(getLocale(), options).format(date);
}

const LABELS: Partial<Record<GridColumn<unknown>['type'], Label>> = {
	boolean: ({ value }) => (value === 'true' ? m.yes() : m.no()),
	number: ({ groupBy, value }) => {
		const from = Number(value);
		return groupBy.step ? `${number(from)}–${number(from + groupBy.step - 1)}` : number(from);
	},
	date: ({ groupBy, value }) => dateLabel({ groupBy, value })
};

export function groupLabel<Row>({
	column,
	groupBy,
	value
}: {
	column: GridColumn<Row>;
	groupBy: GroupBy;
	value: string | null;
}): string {
	if (value === null) return m.dataGridGroupEmpty();
	const label = LABELS[column.type];
	return label ? label({ column, groupBy, value }) : formatValue({ column, value });
}
