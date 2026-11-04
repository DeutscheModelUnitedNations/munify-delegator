<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { sortViews, type SavedView, type ViewAction } from '#lib/dataGrid/views';
	import { viewActionEntry } from './viewActionLabels';

	/**
	 * The views menu: the base view, the shared views, the caller's own - marked when they are a
	 * default or global - and below them what can be done with the current one.
	 */
	interface Props {
		views: readonly SavedView[];
		current: SavedView | null;
		dirty: boolean;
		actions: readonly ViewAction[];
		busy: boolean;
		onselect: (view: SavedView | null) => void;
		onaction: (action: ViewAction) => void;
	}

	let { views, current, dirty, actions, busy, onselect, onaction }: Props = $props();

	const sorted = $derived(sortViews(views));
	const shared = $derived(sorted.filter((view) => view.shared));
	const personal = $derived(sorted.filter((view) => !view.shared));
</script>

{#snippet viewItem(view: SavedView)}
	<li>
		<button class:menu-active={current?.id === view.id} onclick={() => onselect(view)}>
			<span class="grow truncate">{view.name}</span>
			{#if view.global}
				<i
					class="fa-sharp-duotone fa-solid fa-globe text-xs opacity-60"
					title={m.dataGridViewGlobal()}
				></i>
			{/if}
			{#if view.isMyDefault}
				<i
					class="fa-sharp-duotone fa-solid fa-bookmark text-primary text-xs"
					title={m.dataGridViewMyDefault()}
				></i>
			{:else if view.isDefault}
				<i
					class="fa-sharp-duotone fa-solid fa-star text-warning text-xs"
					title={m.dataGridViewDefault()}
				></i>
			{/if}
		</button>
	</li>
{/snippet}

<div class="dropdown no-print">
	<button tabindex="0" class="btn btn-sm btn-ghost max-w-56" disabled={busy}>
		<i class="fa-sharp-duotone fa-solid fa-table-layout"></i>
		<span class="truncate">{current?.name ?? m.dataGridBaseView()}</span>
		{#if dirty}
			<span class="badge badge-warning badge-xs" title={m.dataGridViewChanged()}></span>
		{/if}
		<i class="fa-sharp-duotone fa-solid fa-chevron-down text-xs"></i>
	</button>
	<ul
		class="dropdown-content menu bg-base-200 rounded-box z-20 max-h-[70vh] w-72 flex-nowrap overflow-y-auto p-2 shadow"
	>
		<li>
			<button class:menu-active={current === null} onclick={() => onselect(null)}>
				<span class="grow">{m.dataGridBaseView()}</span>
			</button>
		</li>
		{#if shared.length > 0}
			<li class="menu-title">{m.dataGridSharedViews()}</li>
			{#each shared as view (view.id)}
				{@render viewItem(view)}
			{/each}
		{/if}
		{#if personal.length > 0}
			<li class="menu-title">{m.dataGridMyViews()}</li>
			{#each personal as view (view.id)}
				{@render viewItem(view)}
			{/each}
		{/if}
		<li class="menu-title">{current?.name ?? m.dataGridBaseView()}</li>
		{#each actions as action (action)}
			{@const entry = viewActionEntry({ action, current })}
			<li>
				<button class:text-error={entry.danger} onclick={() => onaction(action)}>
					<i class="fa-sharp-duotone fa-solid {entry.icon}"></i>
					{entry.label}
				</button>
			</li>
		{/each}
	</ul>
</div>
