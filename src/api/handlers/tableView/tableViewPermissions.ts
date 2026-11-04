import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isSystemAdmin,
	isTeamMemberOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { rolesWithTeamPermission } from '#lib/helpers/teamRoles';
import type { DataTableKey } from '#lib/dataGrid/tableKeys';
import { m } from '#lib/paraglide/messages';
import { DATA_TABLE_PERMISSION } from '../dataTable/dataTablePermissions';

/**
 * Who sees and changes saved views (`#lib/dataGrid/views` explains them):
 *
 *   personal           its owner, nobody else (not even a system admin reads another's)
 *   shared, conference the conference's team reads it; `manageTableViews` changes it
 *   shared, global     everyone signed in reads it; system admins change it
 *
 * Creating a view of a table in a conference needs the table's own permission there: a view of a
 * list one cannot open could not be checked.
 */
/** The shared views offered in every conference. */
const GLOBAL_SHARED = { shared: true, conferenceId: { isNull: true } } as const;

export function registerTableViewAbilities() {
	abilityBuilder.tableView.allow(['update', 'delete']).when(systemAdmin);
	// a system admin reads every shared view, but nobody's personal ones
	abilityBuilder.tableView
		.allow('read')
		.when((ctx) => grantWhere(isSystemAdmin(ctx) ? { shared: true } : undefined));
	abilityBuilder.tableView.allow(['read', 'update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return grantWhere(id ? { shared: false, ownerUserId: id } : undefined);
	});
	abilityBuilder.tableView.allow('read').when((ctx) => {
		const conference = isTeamMemberOf({ ctx });
		return grantWhere(conference ? { shared: true, conference } : undefined);
	});
	abilityBuilder.tableView
		.allow('read')
		.when((ctx) => grantWhere(callerUserId(ctx) ? GLOBAL_SHARED : undefined));
	abilityBuilder.tableView.allow(['update', 'delete']).when((ctx) => {
		const conference = isTeamMemberOf({
			ctx,
			roles: rolesWithTeamPermission('manageTableViews')
		});
		return grantWhere(conference ? { shared: true, conference } : undefined);
	});

	abilityBuilder.tableViewDefault.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.tableViewDefault.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return grantWhere(id ? { userId: id } : undefined);
	});
}

/** Where a new view goes: shared or personal, the conference's or global. */
export interface ViewScope {
	tableKey: DataTableKey;
	conferenceId: string;
	shared: boolean;
	global: boolean;
}

/**
 * Refuses unless the caller may create a view of that scope (see the module comment): the table's
 * permission in the conference (FORBIDDEN), and for a shared view `manageTableViews` there or, for
 * a global one, a system admin. Returns the owner of the new view: the caller for a personal view,
 * nobody for a shared one.
 */
export async function assertCanCreateTableView({
	ctx,
	scope
}: {
	ctx: ApiContext;
	scope: ViewScope;
}): Promise<{ ownerUserId: string | null; createdById: string }> {
	const { sub } = ctx.mustBeLoggedIn();
	const { conferenceId, tableKey } = scope;
	await assertTeamPermission({ ctx, conferenceId, permission: DATA_TABLE_PERMISSION[tableKey] });
	if (scope.shared && scope.global && !isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.tableViewGlobalSharedAdminsOnly() });
	}
	if (scope.shared && !scope.global) {
		await assertTeamPermission({ ctx, conferenceId, permission: 'manageTableViews' });
	}
	return { ownerUserId: scope.shared ? null : sub, createdById: sub };
}

/**
 * The view `id` as the caller may `action` it (NOT_FOUND otherwise, whether it exists or not), for
 * the mutations that need the row.
 */
export async function loadTableViewAllowed({
	ctx,
	id,
	action
}: {
	ctx: ApiContext;
	id: string;
	action: 'read' | 'update';
}) {
	const allowed = (await ctx.abilities.tableView.filter(action)).merge({ where: { id } }).query
		.single;
	const view = await db.query.tableView.findFirst(allowed);
	if (!view) {
		throw apiError({
			code: 'NOT_FOUND',
			message: action === 'update' ? m.updateNotFoundOrForbidden() : m.tableViewNotFound()
		});
	}
	return view;
}

/**
 * Refuses unless the caller may pick `viewId` as their own default for the table in the
 * conference: the table's permission there, and a view they read, of that table, of that
 * conference or global. Returns the caller's id.
 */
export async function assertCanPickMyDefault({
	ctx,
	tableKey,
	conferenceId,
	viewId
}: {
	ctx: ApiContext;
	tableKey: DataTableKey;
	conferenceId: string;
	viewId: string | null;
}) {
	const { sub } = ctx.mustBeLoggedIn();
	await assertTeamPermission({ ctx, conferenceId, permission: DATA_TABLE_PERMISSION[tableKey] });
	if (viewId) {
		const view = await loadTableViewAllowed({ ctx, id: viewId, action: 'read' });
		const elsewhere = view.conferenceId !== null && view.conferenceId !== conferenceId;
		if (view.tableKey !== tableKey || elsewhere) {
			throw apiError({ code: 'INVALID_INPUT', message: m.tableViewOtherTable() });
		}
	}
	return { userId: sub };
}
