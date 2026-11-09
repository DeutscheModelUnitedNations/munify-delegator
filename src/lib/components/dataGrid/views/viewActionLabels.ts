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
		icon: 'ph-floppy-disk'
	}),
	discard: () => ({ label: m.dataGridViewDiscard(), icon: 'ph-arrow-counter-clockwise' }),
	saveAs: () => ({ label: m.dataGridViewSaveAs(), icon: 'ph-plus' }),
	rename: () => ({ label: m.dataGridViewRename(), icon: 'ph-pen' }),
	setDefault: (current) =>
		current?.isDefault
			? { label: m.dataGridViewUnsetDefault(), icon: 'ph-star-half' }
			: { label: m.dataGridViewSetDefault(), icon: 'ph-star' },
	myDefault: (current) => {
		if (current?.isMyDefault) return { label: m.dataGridViewUnsetMyDefault(), icon: 'ph-x-circle' };
		return {
			label: current ? m.dataGridViewSetMyDefault() : m.dataGridViewBaseAsMyDefault(),
			icon: 'ph-bookmark-simple'
		};
	},
	publish: () => ({ label: m.dataGridViewPublish(), icon: 'ph-share-network' }),
	duplicate: () => ({ label: m.dataGridViewDuplicate(), icon: 'ph-copy' }),
	delete: () => ({ label: m.dataGridViewDelete(), icon: 'ph-trash', danger: true })
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
