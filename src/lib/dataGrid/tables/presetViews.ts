import type { FilterCondition, TableState } from '../stateSchema';
import { baseState } from '../tableState';

/**
 * The shared views every installation starts with: global (no conference), so every team finds
 * them in the views menu, and changed or deleted by system admins like any other global view.
 *
 * Migrations insert exactly these rows (`table_view_presets`; a later preset brings its own), and
 * the dev seed, which empties every table, inserts them again; `presetViews.test.ts` checks that
 * the migrations insert them as they are here.
 */
export interface PresetTableView {
	/** Fixed, so inserting them again changes nothing */
	id: string;
	tableKey: string;
	name: string;
	state: TableState;
}

const isTrue = (column: string): FilterCondition => ({
	type: 'condition',
	column,
	operator: 'isTrue'
});

export const PRESET_TABLE_VIEWS: readonly PresetTableView[] = [
	{
		id: 'preset-participants-waiting-list',
		tableKey: 'participants',
		name: 'Warteliste',
		// Everyone still waiting for a seat, in the order they signed up.
		state: {
			...baseState({
				sorting: [{ id: 'waitingListSince', desc: false }],
				filter: { type: 'group', op: 'and', items: [isTrue('onWaitingList')] },
				pageSize: 20
			}),
			visibility: { waitingListSince: true }
		}
	},
	{
		id: 'preset-participants-open-issues',
		tableKey: 'participants',
		name: 'Offene Probleme',
		// Accepted participants whose payment or registration documents are not complete.
		state: baseState({
			sorting: [{ id: 'family_name', desc: false }],
			filter: { type: 'group', op: 'and', items: [isTrue('accepted'), isTrue('hasOpenIssue')] },
			pageSize: 20
		})
	}
];
