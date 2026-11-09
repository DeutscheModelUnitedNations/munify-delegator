import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTableStateValue } from '../stateSchema';
import { PARTICIPANTS_COLUMNS } from './participants';
import { PRESET_TABLE_VIEWS } from './presetViews';

const COLUMNS: Record<string, readonly { id: string }[]> = { participants: PARTICIPANTS_COLUMNS };

/** Every migration's SQL: a preset added later comes with a migration of its own. */
const migrations = readdirSync('drizzle', { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => readFileSync(join('drizzle', entry.name, 'migration.sql'), 'utf8'))
	.join('\n');

describe('PRESET_TABLE_VIEWS', () => {
	it.each(PRESET_TABLE_VIEWS)('$name is a valid state of its table', (view) => {
		expect(parseTableStateValue(view.state)).toEqual(view.state);
		const known = new Set((COLUMNS[view.tableKey] ?? []).map((column) => column.id));
		const named = [
			...view.state.sorting.map((sort) => sort.id),
			...view.state.filter.items.flatMap((item) =>
				item.type === 'condition' ? [item.column] : item.items.map((inner) => inner.column)
			),
			...Object.keys(view.state.visibility)
		];
		expect(named.filter((id) => !known.has(id))).toEqual([]);
	});

	it.each(PRESET_TABLE_VIEWS)('$name is inserted by a migration as it is here', (view) => {
		expect(migrations).toContain(
			`('${view.id}', '${view.tableKey}', '${view.name}', '${JSON.stringify(view.state)}'::jsonb`
		);
	});
});
