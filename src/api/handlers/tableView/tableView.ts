import { assertFindFirstExists, refreshAbilities } from '@m1212e/rumble';
import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import type { TableState } from '#lib/dataGrid/stateSchema';
import { tableViewDefaultPubsub, tableViewPubsub } from '#api/pubsub';
import { deleteIfAllowed, updateIfAllowed } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import {
	assertCanCreateTableView,
	assertCanPickMyDefault,
	loadTableViewAllowed,
	registerTableViewAbilities,
	type ViewScope
} from './tableViewPermissions';
import {
	createTableView,
	setMyDefault,
	setSharedDefault,
	tableViewArgSchemas,
	viewUpdate
} from './tableViewService';

registerTableViewAbilities();

/**
 * The read filter for the view `id`, to answer a mutation with the row it wrote. Rumble resolves
 * relational rules once per request, before the write, so they are resolved again first.
 */
async function readableView({ ctx, id }: { ctx: ApiContext; id: string }) {
	refreshAbilities(ctx.abilities);
	return (await ctx.abilities.tableView.filter('read')).merge({ where: { id } }).query.single;
}

/**
 * Creates a view of `scope` once the caller may (`assertCanCreateTableView`): the conference's, or
 * with `global` nobody's. Answers its id.
 */
async function createAllowedView({
	ctx,
	scope,
	view
}: {
	ctx: ApiContext;
	scope: ViewScope;
	view: { name: string; state: TableState; isDefault?: boolean | null };
}) {
	const owner = await assertCanCreateTableView({ ctx, scope });
	return createTableView({
		tableKey: scope.tableKey,
		conferenceId: scope.global ? null : scope.conferenceId,
		name: view.name,
		state: view.state,
		...owner,
		isDefault: view.isDefault ?? false
	});
}

const TableViewRef = object({ table: 'tableView' });
query({ table: 'tableView' });
object({ table: 'tableViewDefault' });
query({ table: 'tableViewDefault' });

schemaBuilder.mutationFields((t) => ({
	createTableView: t.drizzleField({
		description:
			"Saves a view of a team table (`#lib/dataGrid`): personal (only the caller's), or shared with everyone who opens the table. A view is the conference's, or with `global` offered in every conference. Needs the table's permission in the conference; shared views `manageTableViews` there, global shared ones a system admin (FORBIDDEN otherwise). A shared view with `isDefault` becomes the table's default in place of the old one.",
		type: TableViewRef,
		args: {
			tableKey: t.arg.string({ required: true }).validate(tableViewArgSchemas.tableKey),
			conferenceId: t.arg.id({
				required: true,
				description: 'The conference the table is opened in, even for a global view.'
			}),
			name: t.arg.string({ required: true }).validate(tableViewArgSchemas.name),
			state: t.arg({ type: 'JSON', required: true }).validate(tableViewArgSchemas.state),
			shared: t.arg.boolean({ required: true }),
			global: t.arg.boolean({ description: 'Offered in every conference; false when left out.' }),
			isDefault: t.arg.boolean({ description: 'Shared views only.' })
		},
		resolve: async (select, _root, args, ctx) => {
			const id = await createAllowedView({
				ctx,
				scope: {
					tableKey: args.tableKey,
					conferenceId: args.conferenceId,
					shared: args.shared,
					global: args.global ?? false
				},
				view: args
			});
			return db.query.tableView
				.findFirst(select(await readableView({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateTableView: t.drizzleField({
		description:
			"Changes the name and/or the state of a view; a field left out stays. Personal views are their owner's to change, shared ones `manageTableViews`'s of their conference, global shared ones system admins' (NOT_FOUND otherwise).",
		type: TableViewRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string().validate(tableViewArgSchemas.name.optional().nullable()),
			state: t.arg({ type: 'JSON' }).validate(tableViewArgSchemas.state.optional().nullable())
		},
		resolve: async (select, _root, args, ctx) => {
			const values = viewUpdate({ name: args.name, state: args.state });
			if (Object.keys(values).length > 0) {
				await updateIfAllowed({ ctx, table: 'tableView', id: args.id, values });
				tableViewPubsub.updated(args.id);
			}
			return db.query.tableView
				.findFirst(select(await readableView({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteTableView: t.field({
		description:
			'Deletes a view, for everyone who sees it; whoever opened the table with it as their own default opens it with the shared default again. Who may is as for `updateTableView`.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'tableView', id: args.id });
			tableViewPubsub.removed();
			// the personal defaults naming it went with it
			tableViewDefaultPubsub.removed();
			return true;
		}
	}),

	setTableViewDefault: t.drizzleField({
		description:
			'Makes a shared view the default its table opens with in its conference (or, for a global view, in every conference without one of its own), or takes that from it. Who may is as for `updateTableView`; a personal view is refused with INVALID_INPUT (pick it with `setMyTableViewDefault`).',
		type: TableViewRef,
		args: { id: t.arg.id({ required: true }), isDefault: t.arg.boolean({ required: true }) },
		resolve: async (select, _root, args, ctx) => {
			const view = await loadTableViewAllowed({ ctx, id: args.id, action: 'update' });
			if (!view.shared) {
				throw apiError({ code: 'INVALID_INPUT', message: m.tableViewDefaultNeedsShared() });
			}
			await setSharedDefault({ view, isDefault: args.isDefault });
			return db.query.tableView
				.findFirst(select(await readableView({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setMyTableViewDefault: t.field({
		description:
			"Picks the view the caller opens a table with in a conference - one of their own or a shared one, of that table and conference or global - or, with `viewId` null, none (the conference's shared default applies again). Needs the table's permission in the conference.",
		type: 'Boolean',
		args: {
			tableKey: t.arg.string({ required: true }).validate(tableViewArgSchemas.tableKey),
			conferenceId: t.arg.id({ required: true }),
			viewId: t.arg.id()
		},
		resolve: async (_root, args, ctx) => {
			const viewId = args.viewId ?? null;
			const { userId } = await assertCanPickMyDefault({
				ctx,
				tableKey: args.tableKey,
				conferenceId: args.conferenceId,
				viewId
			});
			await setMyDefault({
				userId,
				tableKey: args.tableKey,
				conferenceId: args.conferenceId,
				viewId
			});
			return true;
		}
	}),

	copyTableView: t.drizzleField({
		description:
			'Saves a copy of a view the caller reads under a new name: a shared view as a personal one anyone may make, or a personal view as a shared one (publishing it). Creating the copy needs what `createTableView` needs for its scope; the original stays.',
		type: TableViewRef,
		args: {
			id: t.arg.id({ required: true }),
			conferenceId: t.arg.id({
				required: true,
				description: 'The conference the table is opened in.'
			}),
			name: t.arg.string({ required: true }).validate(tableViewArgSchemas.name),
			shared: t.arg.boolean({ required: true }),
			global: t.arg.boolean({ description: 'Offered in every conference; false when left out.' }),
			isDefault: t.arg.boolean({
				description: 'A shared copy becomes the default; shared copies only.'
			})
		},
		resolve: async (select, _root, args, ctx) => {
			const source = await loadTableViewAllowed({ ctx, id: args.id, action: 'read' });
			const id = await createAllowedView({
				ctx,
				scope: {
					tableKey: tableViewArgSchemas.tableKey.parse(source.tableKey),
					conferenceId: args.conferenceId,
					shared: args.shared,
					global: args.global ?? false
				},
				view: {
					name: args.name,
					state: tableViewArgSchemas.state.parse(source.state),
					isDefault: args.isDefault
				}
			});
			return db.query.tableView
				.findFirst(select(await readableView({ ctx, id })))
				.then(assertFindFirstExists);
		}
	})
}));
