import type { Component, ComponentProps } from 'svelte';
import { getLocale } from '#lib/paraglide/runtime';
import { m } from '#lib/paraglide/messages';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';
import { dayOf } from '#lib/dataGrid/dateConditions';
import type { LocalColumn } from '#lib/dataGrid/localEngine';
import type { StateColumn } from '#lib/dataGrid/tableState';

/**
 * A column of a `DataGrid`: what the shared logic knows of it (`ColumnMeta`: id, type, options),
 * plus how the page shows it. A page describes its data with these; searching, filtering, sorting,
 * grouping, views and the export come from the grid for every table alike.
 */

// TYPE-SAFETY-EXCEPTION: a component of any props has to be accepted so that its props can be
// inferred from it; `cellOf` below is what keeps a call site type-safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any>;

/** A Svelte component and the props to render a cell with. */
export interface CellRender {
	component: AnyComponent;
	props: Record<string, unknown>;
}

/** A cell rendered by `component`; `props` has to be what the component takes. */
export function cellOf<C extends AnyComponent>({
	component,
	props
}: {
	component: C;
	props: ComponentProps<C>;
}): CellRender {
	return { component, props };
}

export interface GridColumn<Row> extends ColumnMeta, StateColumn {
	label: string;
	/** The heading the column is listed under in the column, filter and grouping menus */
	group?: string;
	/** Explains the column in the menus, where its label does not say enough */
	description?: string;
	/** Width in pixels until someone resizes it */
	size?: number;
	align?: 'left' | 'center' | 'right';
	/** The text of one of an enum's values; the value itself where left out */
	optionLabel?: (value: string) => string;
	/**
	 * The row's value. Required for a table held in the browser (filtered, sorted and grouped by
	 * it); for a server table only what the cell and the export show.
	 */
	value?: (row: Row) => unknown;
	/** The text the cell shows and the export holds; the formatted `value` where left out */
	text?: (row: Row) => string;
	/** A component for the cell, where text is not enough */
	cell?: (row: Row) => CellRender | undefined;
	/** The text the export holds, where it differs from `text` */
	exportValue?: (row: Row) => string;
	/** A table held in the browser searches the column unless false */
	searchable?: boolean;
}

/** The label of one of a column's options. */
export function optionLabelOf<Row>({ column, value }: { column: GridColumn<Row>; value: string }) {
	return column.optionLabel?.(value) ?? value;
}

const dateFormat = () => new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' });

function formatDate(value: unknown) {
	if (value instanceof Date) return dateFormat().format(value);
	const day = dayOf(value);
	return day ? dateFormat().format(new Date(`${day}T00:00:00`)) : '';
}

type Format = <Row>(args: { column: GridColumn<Row>; value: unknown }) => string;

/** How a value of each column type reads as text (empty values are handled before). */
const FORMATS: Record<ColumnMeta['type'], Format> = {
	boolean: ({ value }) => (value ? m.yes() : m.no()),
	date: ({ value }) => formatDate(value),
	number: ({ value }) =>
		typeof value === 'number' ? value.toLocaleString(getLocale()) : String(value),
	enum: ({ column, value }) => optionLabelOf({ column, value: String(value) }),
	multiEnum: ({ column, value }) =>
		Array.isArray(value)
			? value.map((item) => optionLabelOf({ column, value: String(item) })).join(', ')
			: '',
	text: ({ value }) => String(value)
};

/** A value as text, the way its column type reads; empty for no value. */
export function formatValue<Row>({ column, value }: { column: GridColumn<Row>; value: unknown }) {
	if (value === null || value === undefined || value === '') return '';
	return FORMATS[column.type]({ column, value });
}

/** The text a cell shows. */
export function cellText<Row>({ column, row }: { column: GridColumn<Row>; row: Row }) {
	if (column.text) return column.text(row);
	return column.value ? formatValue({ column, value: column.value(row) }) : '';
}

/** The text an export holds for a cell. */
export function exportText<Row>({ column, row }: { column: GridColumn<Row>; row: Row }) {
	return column.exportValue?.(row) ?? cellText({ column, row });
}

/** The columns as the local engine reads them; a column without a value reads as empty. */
export function localColumns<Row>(columns: readonly GridColumn<Row>[]): LocalColumn<Row>[] {
	return columns.map((column) => ({
		...column,
		value: column.value ?? (() => null),
		searchText: (row: Row) => cellText({ column, row })
	}));
}

/** The columns by their headings, in the order the headings first appear. */
export function columnGroups<Row>({
	columns,
	fallback
}: {
	columns: readonly GridColumn<Row>[];
	fallback: string;
}) {
	const groups = new Map<string, GridColumn<Row>[]>();
	for (const column of columns) {
		const title = column.group ?? fallback;
		groups.set(title, [...(groups.get(title) ?? []), column]);
	}
	return [...groups].map(([title, items]) => ({ title, columns: items }));
}

/** What a page adds to a column's shared metadata: everything but id and type. */
export type ColumnExtras<Row> = Omit<GridColumn<Row>, 'id' | 'type'>;

/**
 * The grid columns of a table whose metadata the API shares (`#lib/dataGrid/tables/…`): every
 * column of `metas`, in their order, with what the page adds to it. A column the page adds nothing
 * to is a compile error, so the two cannot drift apart.
 */
export function defineColumns<Row, const Meta extends ColumnMeta>({
	metas,
	extras
}: {
	metas: readonly Meta[];
	extras: Record<Meta['id'], ColumnExtras<Row>>;
}): GridColumn<Row>[] {
	return metas.map((meta) => {
		const id: Meta['id'] = meta.id;
		return { ...meta, ...extras[id] };
	});
}
