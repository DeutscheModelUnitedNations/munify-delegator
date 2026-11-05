<script lang="ts" generics="Row">
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import type { TableState } from '#lib/dataGrid/stateSchema';
	import {
		canShare,
		viewActions,
		type SavedView,
		type ViewAction,
		type ViewRights
	} from '#lib/dataGrid/views';
	import type { GridState } from '../gridState.svelte';
	import ViewMenu from './ViewMenu.svelte';
	import { deleteConfirmText } from './viewActionLabels';
	import ViewNameDialog, { type ViewScopeChoice } from './ViewNameDialog.svelte';
	import {
		copyView,
		createView,
		deleteView,
		setMyDefault,
		setSharedDefault,
		updateView,
		type ViewsTarget
	} from './viewsApi';

	/**
	 * The saved views of a grid: the menu, the dialogs and the calls to the API. The list itself is
	 * live (`fetchSavedViews`), so after a call there is nothing to refresh; the grid only switches
	 * to a view the call created.
	 */
	interface Props {
		grid: GridState<Row>;
		target: ViewsTarget;
		views: readonly SavedView[];
		rights: ViewRights;
		base: TableState;
	}

	let { grid, target, views, rights, base }: Props = $props();

	let dialog = $state<'saveAs' | 'rename' | 'publish' | 'duplicate' | null>(null);
	let busy = $state(false);

	const current = $derived(grid.view);
	const hasMyDefault = $derived(views.some((view) => view.isMyDefault));
	const actions = $derived(viewActions({ current, dirty: grid.dirty, rights, hasMyDefault }));

	/** Runs a call with a toast; true when it went through. */
	async function run<T>(call: () => Promise<T>): Promise<T | undefined> {
		busy = true;
		try {
			const promise = call();
			toast.promise(promise, genericPromiseToastMessages);
			return await promise;
		} catch {
			return undefined;
		} finally {
			busy = false;
		}
	}

	async function saveAs(choice: ViewScopeChoice) {
		const created = await run(() => createView({ target, state: grid.snapshot(), ...choice }));
		if (!created) return;
		grid.markSaved(created.id);
		dialog = null;
	}

	async function copy(choice: ViewScopeChoice) {
		if (!current) return;
		const copied = await run(() => copyView({ target, id: current.id, ...choice }));
		if (!copied) return;
		// the copy holds the view as it was saved, not the changes on screen: switch to it
		grid.selectView({
			next: {
				...current,
				id: copied.id,
				name: choice.name,
				shared: choice.shared,
				global: choice.global,
				mine: !choice.shared,
				isDefault: choice.isDefault,
				isMyDefault: false
			},
			base
		});
		dialog = null;
	}

	async function rename({ name }: ViewScopeChoice) {
		if (!current) return;
		if (await run(() => updateView({ id: current.id, name }))) dialog = null;
	}

	async function remove() {
		if (!current) return;
		const { id } = current;
		const confirmed = await confirmDialog({
			text: deleteConfirmText(current),
			danger: true,
			confirmLabel: m.dataGridViewDelete()
		});
		if (confirmed && (await run(() => deleteView(id)))) grid.selectView({ next: null, base });
	}

	const ACTIONS: Record<ViewAction, () => void> = {
		save: () => {
			if (!current) return;
			const id = current.id;
			void run(() => updateView({ id, state: grid.snapshot() })).then((saved) => {
				if (saved) grid.markSaved(id);
			});
		},
		discard: () => grid.discard(),
		saveAs: () => (dialog = 'saveAs'),
		rename: () => (dialog = 'rename'),
		setDefault: () => {
			if (current)
				void run(() => setSharedDefault({ id: current.id, isDefault: !current.isDefault }));
		},
		myDefault: () => {
			const viewId = current && !current.isMyDefault ? current.id : null;
			void run(() => setMyDefault({ target, viewId }));
		},
		publish: () => (dialog = 'publish'),
		duplicate: () => (dialog = 'duplicate'),
		delete: () => void remove()
	};
</script>

<ViewMenu
	{views}
	{current}
	dirty={grid.dirty}
	{actions}
	{busy}
	onselect={(next) => grid.selectView({ next, base })}
	onaction={(action) => ACTIONS[action]()}
/>

{#if dialog === 'saveAs'}
	<ViewNameDialog
		title={m.dataGridViewSaveAs()}
		submitLabel={m.save()}
		canShare={canShare(rights)}
		canShareGlobally={rights.manageGlobal}
		{busy}
		onclose={() => (dialog = null)}
		onsubmit={saveAs}
	/>
{:else if dialog === 'rename' && current}
	<ViewNameDialog
		title={m.dataGridViewRename()}
		submitLabel={m.dataGridViewRename()}
		initialName={current.name}
		nameOnly
		canShare={false}
		canShareGlobally={false}
		{busy}
		onclose={() => (dialog = null)}
		onsubmit={rename}
	/>
{:else if (dialog === 'publish' || dialog === 'duplicate') && current}
	<ViewNameDialog
		title={dialog === 'publish' ? m.dataGridViewPublish() : m.dataGridViewDuplicate()}
		submitLabel={m.save()}
		initialName={current.name}
		canShare={dialog === 'publish' && canShare(rights)}
		initialShared={dialog === 'publish'}
		canShareGlobally={rights.manageGlobal}
		{busy}
		onclose={() => (dialog = null)}
		onsubmit={copy}
	/>
{/if}
