import { findOperator, isComplete, type ValueInput } from '#lib/dataGrid/operators';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';
import type { FilterCondition, TableState } from '#lib/dataGrid/stateSchema';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import { PARTICIPANTS_COLUMNS } from '#lib/dataGrid/tables/participants';
import { SCHOOLS_COLUMNS } from '#lib/dataGrid/tables/schools';
import { TEAM_MEMBERS_COLUMNS } from '#lib/dataGrid/tables/teamMembers';
import { WAITING_LIST_COLUMNS } from '#lib/dataGrid/tables/waitingList';

/**
 * What a saved view's state may hold when an AI assistant writes it over the MCP server.
 *
 * A view's state is configuration, but a filter carries values, and a filter on a name column
 * carries a name: an assistant passing one would hand personal data in, which no tool takes. So,
 * as `classification.ts` does for the schema, every column of every team table is classified
 * here, and only `visible` columns (ids, statuses, roles, counts, school, city, country) may be
 * filtered, sorted or grouped by. Which columns show, in which order and how wide is free: it
 * names columns, not values. Any column id the table does not have is refused, since a made-up
 * id is free text too. `viewStateGuard.test.ts` fails while a column is missing here.
 */

interface ColumnClassification {
	visible: readonly string[];
	redacted: readonly string[];
}

export const TABLE_COLUMN_CLASSES: Record<DataTableKey, ColumnClassification> = {
	participants: {
		visible: [
			'userId',
			'city',
			'country',
			'role',
			'nation',
			'committee',
			'school',
			'isHeadDelegate',
			'assignedRoleName',
			'teamRole',
			'onWaitingList',
			'waitingListSince',
			'seatedFromWaitingListAt',
			'plansOwnAttendance',
			'paymentStatus',
			'postalRegistrationStatus',
			'didAttend',
			'termsAndConditions',
			'guardianConsent',
			'mediaConsent',
			'accepted',
			'hasOpenIssue',
			'participationCount'
		],
		redacted: [
			'family_name',
			'given_name',
			'email',
			'phone',
			'birthday',
			// derived from the birthday
			'ageAtConference',
			'hasBirthdayDuringConference',
			'gender',
			'pronouns',
			'foodPreference',
			'documentNumber',
			'accessCardId'
		]
	},
	waitingList: {
		visible: [
			'position',
			'createdAt',
			'assignedAt',
			'seated',
			'participationCount',
			'city',
			'school',
			'hidden'
		],
		redacted: [
			'family_name',
			'given_name',
			'email',
			'phone',
			'birthday',
			'conferenceAge',
			'motivation',
			'experience',
			'requests'
		]
	},
	teamMembers: {
		visible: ['role', 'profileComplete', 'joinedAt'],
		redacted: ['family_name', 'given_name', 'email', 'phone']
	},
	schools: {
		visible: [
			'name',
			'city',
			'foreign',
			'delegations',
			'participants',
			'applied',
			'seated',
			'supervisors',
			'waitingList',
			'conferences',
			'participantsOverall'
		],
		redacted: []
	}
};

export const TABLE_COLUMNS: Record<DataTableKey, readonly ColumnMeta[]> = {
	participants: PARTICIPANTS_COLUMNS,
	waitingList: WAITING_LIST_COLUMNS,
	teamMembers: TEAM_MEMBERS_COLUMNS,
	schools: SCHOOLS_COLUMNS
};

/** The keys a record value may have, by the operator's input. */
const RECORD_KEYS: Partial<Record<string, readonly string[]>> = {
	numberRange: ['from', 'to'],
	dateRange: ['from', 'to'],
	relative: ['amount', 'unit']
};

type ValueCheck = (args: {
	column: ColumnMeta;
	input: ValueInput;
	value: unknown;
}) => string | undefined;

const fitsOperator: ValueCheck = ({ column, input, value }) =>
	isComplete({ input, value })
		? undefined
		: `filter: the value for ${column.id} does not fit its operator`;

/** A record value (a range, a span) holds only the keys its operator takes. */
const knownRecordKeys: ValueCheck = ({ column, input, value }) => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
	const allowed = RECORD_KEYS[input] ?? [];
	const extra = Object.keys(value).find((key) => !allowed.includes(key));
	return extra && `filter: the value for ${column.id} has no field ${extra}`;
};

/** Options come from the column's closed list; a column without one takes any. */
const knownOptions: ValueCheck = ({ column, input, value }) => {
	const { options } = column;
	if (!options || (input !== 'option' && input !== 'options')) return undefined;
	const unknown = [value].flat().find((option) => !options.includes(String(option)));
	return unknown === undefined ? undefined : `filter: ${column.id} has no option ${unknown}`;
};

const VALUE_CHECKS = [fitsOperator, knownRecordKeys, knownOptions];

/** Why a value does not fit its operator, or undefined. A missing value filters nothing. */
function valueProblem(args: Parameters<ValueCheck>[0]) {
	if (args.value === undefined || args.value === null) return undefined;
	for (const check of VALUE_CHECKS) {
		const problem = check(args);
		if (problem) return problem;
	}
	return undefined;
}

function conditionProblem({
	condition,
	column
}: {
	condition: FilterCondition;
	column: ColumnMeta;
}): string | undefined {
	const operator = findOperator({ type: column.type, id: condition.operator });
	if (!operator) return `filter: column ${column.id} has no operator ${condition.operator}`;
	return valueProblem({ column, input: operator.input, value: condition.value });
}

function conditionsOf(state: TableState): FilterCondition[] {
	return state.filter.items.flatMap((item) => (item.type === 'group' ? item.items : [item]));
}

/**
 * Why an assistant may not store `state` as a view of `tableKey`; empty when it may. The problems
 * name columns and operators only, never a value.
 */
export function assistantViewStateProblems({
	tableKey,
	state
}: {
	tableKey: DataTableKey;
	state: TableState;
}): string[] {
	const columns = new Map(TABLE_COLUMNS[tableKey].map((column) => [column.id, column]));
	const visible = new Set(TABLE_COLUMN_CLASSES[tableKey].visible);
	const problems: string[] = [];

	const named = [
		...Object.keys(state.visibility),
		...state.order,
		...Object.keys(state.sizes),
		...state.sorting.map((sort) => sort.id),
		...state.grouping.map((group) => group.column),
		...conditionsOf(state).map((condition) => condition.column)
	];
	for (const id of new Set(named)) {
		if (!columns.has(id)) problems.push(`the table has no column ${id}`);
	}

	const byPersonalData = (purpose: string, ids: string[]) => {
		for (const id of new Set(ids)) {
			if (columns.has(id) && !visible.has(id)) {
				problems.push(`${purpose} by ${id}, which is personal data`);
			}
		}
	};
	byPersonalData(
		'filtering',
		conditionsOf(state).map((condition) => condition.column)
	);
	byPersonalData(
		'sorting',
		state.sorting.map((sort) => sort.id)
	);
	byPersonalData(
		'grouping',
		state.grouping.map((group) => group.column)
	);

	// group keys are the grouping columns' values; without grouping there is nothing to name
	if (state.grouping.length === 0 && state.groups.toggled.length > 0) {
		problems.push('groups: toggled groups without any grouping');
	}

	for (const condition of conditionsOf(state)) {
		const column = columns.get(condition.column);
		if (!column || !visible.has(column.id)) continue;
		const problem = conditionProblem({ condition, column });
		if (problem) problems.push(problem);
	}
	return problems;
}
