import type { TableState } from './stateSchema';

/**
 * Saved views as the grid sees them, which one opens first, and what the views menu offers.
 *
 * A view is personal (only its owner sees it) or shared (everyone who opens the table), and either
 * belongs to one conference or is global (offered in every conference). Who may change one:
 *
 *   personal           its owner
 *   shared, conference whoever holds `manageTableViews` there (and system admins)
 *   shared, global     system admins
 */
export interface SavedView {
	id: string;
	name: string;
	state: TableState;
	shared: boolean;
	/** Offered in every conference rather than one */
	global: boolean;
	/** The caller owns it (personal views only) */
	mine: boolean;
	/** The shared default of its conference, or the global one */
	isDefault: boolean;
	/** The caller picked it as their own default for this table and conference */
	isMyDefault: boolean;
}

/** What the caller may do with views, beyond their own personal ones. */
export interface ViewRights {
	/** Create and change the conference's shared views */
	manageShared: boolean;
	/** Create and change global shared views */
	manageGlobal: boolean;
}

/**
 * The view a table opens with: the caller's own default, else the conference's shared default,
 * else the global shared default, else none (the table's base view).
 */
export function initialView(views: readonly SavedView[]): SavedView | null {
	return (
		views.find((view) => view.isMyDefault) ??
		views.find((view) => view.shared && view.isDefault && !view.global) ??
		views.find((view) => view.shared && view.isDefault && view.global) ??
		null
	);
}

/** Whether the caller may change (save, rename, delete) a view. */
export function canEditView({ view, rights }: { view: SavedView; rights: ViewRights }) {
	if (!view.shared) return view.mine;
	return view.global ? rights.manageGlobal : rights.manageShared;
}

/** Whether the caller may create a shared view at all. */
export function canShare(rights: ViewRights) {
	return rights.manageShared || rights.manageGlobal;
}

export type ViewAction =
	| 'save'
	| 'discard'
	| 'saveAs'
	| 'rename'
	| 'setDefault'
	| 'myDefault'
	| 'publish'
	| 'duplicate'
	| 'delete';

/**
 * What the views menu offers for the current view, in order. Discarding changes is everyone's: it
 * only touches their own URL. On the base view only saving as a new view, discarding and making
 * the base view one's own default are offered.
 */
export function viewActions({
	current,
	dirty,
	rights,
	hasMyDefault
}: {
	current: SavedView | null;
	dirty: boolean;
	rights: ViewRights;
	/** Whether the caller has a default of their own for this table */
	hasMyDefault: boolean;
}): ViewAction[] {
	const editable = current !== null && canEditView({ view: current, rights });
	const entries: (ViewAction | false)[] = [
		dirty && editable && 'save',
		dirty && 'discard',
		'saveAs',
		editable && 'rename',
		current !== null && current.shared && editable && 'setDefault',
		(current !== null || hasMyDefault) && 'myDefault',
		current !== null && !current.shared && current.mine && canShare(rights) && 'publish',
		current !== null && current.shared && 'duplicate',
		editable && 'delete'
	];
	return entries.filter((entry) => entry !== false);
}

/** The views in the order the menu lists them: shared first, then personal, each by name. */
export function sortViews(views: readonly SavedView[]): SavedView[] {
	return [...views].sort(
		(a, b) =>
			Number(b.shared) - Number(a.shared) ||
			Number(a.global) - Number(b.global) ||
			a.name.localeCompare(b.name)
	);
}
