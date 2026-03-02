<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Table, VisibilityState } from '$lib/components/TanStackTable';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ColumnMeta, ParticipantRow, ColumnCategory } from './types';

	interface Props {
		open: boolean;
		table: Table<ParticipantRow>;
		conferenceId: string;
		onVisibilityChange: (state: VisibilityState) => void;
	}

	let {
		open = $bindable(),
		table,
		conferenceId: _conferenceId,
		onVisibilityChange
	}: Props = $props();

	const categories: { key: ColumnCategory; label: string }[] = [
		{ key: 'personal', label: m.givenName() },
		{ key: 'role', label: m.participationType() },
		{ key: 'status', label: m.postalRegistration() },
		{ key: 'computed', label: m.conferenceAge() }
	];

	const allColumns = $derived(table.getAllColumns().filter((col) => col.columnDef.meta));

	const groupedColumns = $derived.by(() => {
		const grouped = new SvelteMap<ColumnCategory, typeof allColumns>();
		for (const col of allColumns) {
			const meta = col.columnDef.meta as ColumnMeta;
			const group = grouped.get(meta.category) ?? [];
			group.push(col);
			grouped.set(meta.category, group);
		}
		return grouped;
	});

	function showAll() {
		const state: VisibilityState = {};
		for (const col of allColumns) {
			state[col.id] = true;
		}
		onVisibilityChange(state);
	}

	function resetToDefaults() {
		const state: VisibilityState = {};
		for (const col of allColumns) {
			const meta = col.columnDef.meta as ColumnMeta;
			state[col.id] = meta.defaultVisible;
		}
		onVisibilityChange(state);
	}

	function toggleColumn(columnId: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const newVisibility = !col.getIsVisible();
		const currentState = table.getState().columnVisibility;
		const newState = { ...currentState, [columnId]: newVisibility };
		onVisibilityChange(newState);
	}
</script>

<Drawer.Root bind:open direction="right">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
		<Drawer.Content
			class="bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden outline-none"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-5 pt-4 pb-3">
				<Drawer.Title class="flex items-center gap-2 text-lg font-bold">
					<i class="fa-duotone fa-columns text-xl"></i>
					{m.columnConfiguration()}
				</Drawer.Title>
				<Drawer.Close class="btn btn-ghost btn-sm btn-circle">
					<i class="fa-duotone fa-xmark"></i>
				</Drawer.Close>
			</div>

			<!-- Scrollable content -->
			<div class="flex-1 overflow-y-auto px-5 pb-5" data-vaul-no-drag>
				<div class="flex flex-col gap-4">
					<div class="flex gap-2">
						<button class="btn btn-ghost btn-sm" onclick={showAll}>
							<i class="fa-duotone fa-eye"></i>
							{m.showAll()}
						</button>
						<button class="btn btn-ghost btn-sm" onclick={resetToDefaults}>
							<i class="fa-duotone fa-arrow-rotate-left"></i>
							{m.resetToDefaults()}
						</button>
					</div>

					{#each categories as cat (cat.key)}
						{@const cols = groupedColumns.get(cat.key)}
						{#if cols && cols.length > 0}
							<div>
								<h3 class="mb-2 text-sm font-semibold text-base-content/70 uppercase">
									{cat.label}
								</h3>
								<div class="flex flex-col gap-1">
									{#each cols as col (col.id)}
										{@const colMeta = col.columnDef.meta as ColumnMeta}
										{@const header =
											typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
										<label class="label cursor-pointer justify-start gap-3 py-1">
											<input
												type="checkbox"
												class="checkbox checkbox-sm checkbox-primary"
												checked={col.getIsVisible()}
												onchange={() => toggleColumn(col.id)}
											/>
											<div class="flex flex-col">
												<span class="label-text">{header}</span>
												{#if colMeta.description !== header}
													<span class="text-xs text-base-content/50">{colMeta.description}</span>
												{/if}
											</div>
										</label>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Drag handle -->
			<div class="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-1">
				<div class="bg-base-content/30 h-12 w-1.5 rounded-full"></div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
