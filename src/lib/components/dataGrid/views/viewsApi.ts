import { client } from '#lib/api/rumbleClient/client';
import { parseTableStateValue, type TableState } from '#lib/dataGrid/stateSchema';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import type { SavedView } from '#lib/dataGrid/views';

/**
 * The saved views of one table in one conference, and the mutations on them. Reads are live, so
 * a view someone else saves, renames or deletes shows up without asking; the mutations only write.
 */
export interface ViewsTarget {
	table: DataTableKey;
	conferenceId: string;
}

/**
 * The views the caller reads for the table in the conference (its own and global ones) and which
 * of them is the caller's own default, as a reader to call inside a `$derived` (where the live
 * results are tracked). A view whose state no longer fits the schema is left out.
 */
export async function fetchSavedViews({
	target,
	userId
}: {
	target: ViewsTarget;
	userId: string;
}): Promise<() => SavedView[]> {
	const [views, defaults] = await Promise.all([
		client.liveQuery.tableViews({
			__args: {
				where: {
					tableKey: { eq: target.table },
					OR: [{ conferenceId: { eq: target.conferenceId } }, { conferenceId: { isNull: true } }]
				}
			},
			id: true,
			name: true,
			state: true,
			shared: true,
			conferenceId: true,
			ownerUserId: true,
			isDefault: true
		}),
		client.liveQuery.tableViewDefaults({
			__args: {
				where: { tableKey: { eq: target.table }, conferenceId: { eq: target.conferenceId } }
			},
			viewId: true
		})
	]);
	return () => savedViewsOf({ views, myDefault: defaults[0]?.viewId, userId });
}

/** The views as the grid sees them. */
function savedViewsOf({
	views,
	myDefault,
	userId
}: {
	views: readonly {
		id: string;
		name: string;
		state: unknown;
		shared: boolean;
		conferenceId: string | null;
		ownerUserId: string | null;
		isDefault: boolean;
	}[];
	myDefault: string | undefined;
	userId: string;
}): SavedView[] {
	return views.flatMap((view) => {
		const state = parseTableStateValue(view.state);
		if (!state) return [];
		return [
			{
				id: view.id,
				name: view.name,
				state,
				shared: view.shared,
				global: view.conferenceId === null,
				mine: view.ownerUserId === userId,
				isDefault: view.isDefault,
				isMyDefault: view.id === myDefault
			}
		];
	});
}

export function createView({
	target,
	name,
	state,
	shared,
	global,
	isDefault
}: {
	target: ViewsTarget;
	name: string;
	state: TableState;
	shared: boolean;
	global: boolean;
	isDefault: boolean;
}) {
	return Promise.resolve(
		client.mutate.createTableView({
			__args: {
				tableKey: target.table,
				conferenceId: target.conferenceId,
				name,
				state,
				shared,
				global,
				isDefault
			},
			id: true
		})
	);
}

export function updateView({ id, name, state }: { id: string; name?: string; state?: TableState }) {
	return Promise.resolve(client.mutate.updateTableView({ __args: { id, name, state }, id: true }));
}

export function deleteView(id: string) {
	return Promise.resolve(client.mutate.deleteTableView({ __args: { id } }));
}

export function setSharedDefault({ id, isDefault }: { id: string; isDefault: boolean }) {
	return Promise.resolve(
		client.mutate.setTableViewDefault({ __args: { id, isDefault }, id: true })
	);
}

export function setMyDefault({ target, viewId }: { target: ViewsTarget; viewId: string | null }) {
	return Promise.resolve(
		client.mutate.setMyTableViewDefault({
			__args: { tableKey: target.table, conferenceId: target.conferenceId, viewId }
		})
	);
}

export function copyView({
	target,
	id,
	name,
	shared,
	global,
	isDefault
}: {
	target: ViewsTarget;
	id: string;
	name: string;
	shared: boolean;
	global: boolean;
	isDefault: boolean;
}) {
	return Promise.resolve(
		client.mutate.copyTableView({
			__args: { id, conferenceId: target.conferenceId, name, shared, global, isDefault },
			id: true
		})
	);
}
