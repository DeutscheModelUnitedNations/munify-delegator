import { m } from '#lib/paraglide/messages';
import type { SavedView, ViewAction } from '#lib/dataGrid/views';

/** How the views menu words and marks an action. */
export interface ViewActionEntry {
	label: string;
	icon: string;
	danger?: boolean;
}

type Describe = (current: SavedView | null) => ViewActionEntry;

const ENTRIES: Record<ViewAction, Describe> = {
	save: (current) => ({
		label: m.dataGridViewSave({ name: current?.name ?? '' }),
		icon: 'fa-floppy-disk'
	}),
	discard: () => ({ label: m.dataGridViewDiscard(), icon: 'fa-rotate-left' }),
	saveAs: () => ({ label: m.dataGridViewSaveAs(), icon: 'fa-plus' }),
	rename: () => ({ label: m.dataGridViewRename(), icon: 'fa-pen' }),
	setDefault: (current) =>
		current?.isDefault
			? { label: m.dataGridViewUnsetDefault(), icon: 'fa-star-half-stroke' }
			: { label: m.dataGridViewSetDefault(), icon: 'fa-star' },
	myDefault: (current) => {
		if (current?.isMyDefault)
			return { label: m.dataGridViewUnsetMyDefault(), icon: 'fa-bookmark-slash' };
		return {
			label: current ? m.dataGridViewSetMyDefault() : m.dataGridViewBaseAsMyDefault(),
			icon: 'fa-bookmark'
		};
	},
	publish: () => ({ label: m.dataGridViewPublish(), icon: 'fa-share-nodes' }),
	duplicate: () => ({ label: m.dataGridViewDuplicate(), icon: 'fa-copy' }),
	delete: () => ({ label: m.dataGridViewDelete(), icon: 'fa-trash', danger: true })
};

/** How the views menu words and marks an action, for the view it acts on. */
export function viewActionEntry({
	action,
	current
}: {
	action: ViewAction;
	current: SavedView | null;
}): ViewActionEntry {
	return ENTRIES[action](current);
}

/** What deleting a view asks first: a shared one goes for everyone. */
export function deleteConfirmText(view: SavedView) {
	return view.shared
		? m.dataGridViewDeleteSharedConfirm({ name: view.name })
		: m.dataGridViewDeleteConfirm({ name: view.name });
}
