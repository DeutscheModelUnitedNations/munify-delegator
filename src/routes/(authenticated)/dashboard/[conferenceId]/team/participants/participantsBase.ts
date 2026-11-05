import type { FilterCondition } from '#lib/dataGrid/stateSchema';
import type { BaseView } from '#lib/dataGrid/tableState';

const isTrue = (column: string): FilterCondition => ({
	type: 'condition',
	column,
	operator: 'isTrue'
});

/** Conference states in which the table opens on accepted participants. */
const STATES_SHOWING_ACCEPTED = ['PREPARATION', 'ACTIVE', 'POST'];

/** The table's base view: by family name, and only the accepted once the conference is underway. */
export function participantsBase(conferenceState: string | null | undefined): BaseView {
	const accepted =
		conferenceState !== null &&
		conferenceState !== undefined &&
		STATES_SHOWING_ACCEPTED.includes(conferenceState);
	return {
		sorting: [{ id: 'family_name', desc: false }],
		filter: { type: 'group', op: 'and', items: accepted ? [isTrue('accepted')] : [] },
		pageSize: 20
	};
}
