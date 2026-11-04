import { and, eq, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema, type Transaction } from '#api/db/db';
import { tableViewDefaultPubsub, tableViewPubsub } from '#api/pubsub';
import { jsonDocument } from '#api/services/argSchemas';
import { whereRows } from '#api/db/whereRows';
import {
	MAX_FILTER_ITEMS,
	MAX_TABLE_STATE_LENGTH,
	countFilterItems,
	tableStateSchema,
	type TableState
} from '#lib/dataGrid/stateSchema';
import { DATA_TABLE_KEYS, type DataTableKey } from '#lib/dataGrid/tableKeys';
import { m } from '#lib/paraglide/messages';

/** The most characters a view's name has. */
const MAX_VIEW_NAME_LENGTH = 80;

/** A whole grid state, as a view stores it: within the schema, the size and the filter's bounds. */
const storableState = tableStateSchema
	.refine((state) => countFilterItems(state.filter) <= MAX_FILTER_ITEMS, {
		error: () => m.tableViewStateTooLarge()
	})
	.refine((state) => JSON.stringify(state).length <= MAX_TABLE_STATE_LENGTH, {
		error: () => m.tableViewStateTooLarge()
	});

export const tableViewArgSchemas = {
	tableKey: z.enum(DATA_TABLE_KEYS, { error: () => m.dataTableUnknown() }),
	name: z
		.string()
		.trim()
		.min(1, { error: () => m.tableViewNameRequired() })
		.max(MAX_VIEW_NAME_LENGTH, {
			error: () => m.tableViewNameTooLong({ max: MAX_VIEW_NAME_LENGTH })
		}),
	state: jsonDocument({
		schema: storableState,
		malformed: () => m.tableViewStateMalformed(),
		invalid: (details) => m.tableViewStateInvalid({ details })
	})
};

/** Creates a view; a shared one asked to be the default becomes it, in place of the old one. */
export async function createTableView({
	tableKey,
	conferenceId,
	name,
	state,
	ownerUserId,
	createdById,
	isDefault = false
}: {
	tableKey: DataTableKey;
	/** `null` for a global view */
	conferenceId: string | null;
	name: string;
	state: TableState;
	ownerUserId: string | null;
	createdById: string;
	isDefault?: boolean;
}) {
	const shared = ownerUserId === null;
	const { id, replaced } = await db.transaction(async (tx) => {
		const replaced = shared && isDefault ? await clearDefault({ tx, tableKey, conferenceId }) : [];
		const [created] = await tx
			.insert(schema.tableView)
			.values({
				tableKey,
				conferenceId,
				name,
				state,
				shared,
				ownerUserId,
				createdById,
				isDefault: shared && isDefault
			})
			.returning({ id: schema.tableView.id });
		return { id: created.id, replaced };
	});
	tableViewPubsub.created();
	if (replaced.length > 0) tableViewPubsub.updated(replaced);
	return id;
}

/** Takes the default away from the table's shared default of that conference (or the global one). */
async function clearDefault({
	tx,
	tableKey,
	conferenceId,
	except
}: {
	tx: Transaction;
	tableKey: string;
	conferenceId: string | null;
	except?: string;
}) {
	const cleared = await tx
		.update(schema.tableView)
		.set({ isDefault: false })
		.where(
			and(
				eq(schema.tableView.tableKey, tableKey),
				conferenceId === null
					? isNull(schema.tableView.conferenceId)
					: eq(schema.tableView.conferenceId, conferenceId),
				eq(schema.tableView.isDefault, true),
				...(except ? [ne(schema.tableView.id, except)] : [])
			)
		)
		.returning({ id: schema.tableView.id });
	return cleared.map((row) => row.id);
}

/**
 * Makes a shared view its table's default in its conference (or the global default), or takes
 * that from it. The caller checked that the view is shared and theirs to change.
 */
export async function setSharedDefault({
	view,
	isDefault
}: {
	view: { id: string; tableKey: string; conferenceId: string | null };
	isDefault: boolean;
}) {
	const changed = await db.transaction(async (tx) => {
		const cleared = isDefault
			? await clearDefault({
					tx,
					tableKey: view.tableKey,
					conferenceId: view.conferenceId,
					except: view.id
				})
			: [];
		await tx.update(schema.tableView).set({ isDefault }).where(eq(schema.tableView.id, view.id));
		return [...cleared, view.id];
	});
	tableViewPubsub.updated(changed);
}

/** The caller's own default for a table in a conference: a view, or none (`null`). */
export async function setMyDefault({
	userId,
	tableKey,
	conferenceId,
	viewId
}: {
	userId: string;
	tableKey: DataTableKey;
	conferenceId: string;
	viewId: string | null;
}) {
	const { tableViewDefault } = schema;
	if (viewId === null) {
		const removed = await db
			.delete(tableViewDefault)
			.where(whereRows({ table: tableViewDefault, filter: { userId, tableKey, conferenceId } }))
			.returning({ id: tableViewDefault.id });
		if (removed.length > 0) tableViewDefaultPubsub.removed();
		return;
	}
	const [row] = await db
		.insert(tableViewDefault)
		.values({ userId, tableKey, conferenceId, viewId })
		.onConflictDoUpdate({
			target: [tableViewDefault.userId, tableViewDefault.tableKey, tableViewDefault.conferenceId],
			set: { viewId, updatedAt: new Date() }
		})
		.returning({ id: tableViewDefault.id });
	tableViewDefaultPubsub.created();
	tableViewDefaultPubsub.updated(row.id);
}

/** The view's changes that are given; left out keeps a field. */
export function viewUpdate({ name, state }: { name?: string | null; state?: TableState | null }) {
	return {
		...(name !== undefined && name !== null ? { name } : {}),
		...(state !== undefined && state !== null ? { state } : {})
	};
}
