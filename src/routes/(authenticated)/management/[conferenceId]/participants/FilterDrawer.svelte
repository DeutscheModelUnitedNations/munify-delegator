<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Table } from '$lib/components/TanStackTable';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ColumnMeta, ParticipantRow, ColumnCategory, TextFilterMode } from './types';
	import {
		translateAdministrativeStatus,
		translateParticipationRole,
		translateFoodPreference,
		translateGender,
		translateTeamRole
	} from '$lib/services/enumTranslations';

	interface Props {
		open: boolean;
		table: Table<ParticipantRow>;
	}

	let { open = $bindable(), table }: Props = $props();

	const enumTranslators: Record<string, (value: string) => string> = {
		role: translateParticipationRole,
		gender: translateGender,
		foodPreference: translateFoodPreference,
		teamRole: translateTeamRole,
		paymentStatus: translateAdministrativeStatus,
		postalRegistrationStatus: translateAdministrativeStatus,
		termsAndConditions: translateAdministrativeStatus,
		guardianConsent: translateAdministrativeStatus,
		mediaConsent: translateAdministrativeStatus,
		committee: (v: string) => v
	};

	function translateEnumValue(columnId: string, value: string): string {
		if (value === '—') return value;
		const translator = enumTranslators[columnId];
		return translator ? translator(value) : value;
	}

	const categories: { key: ColumnCategory; label: string }[] = [
		{ key: 'personal', label: m.givenName() },
		{ key: 'role', label: m.participationType() },
		{ key: 'status', label: m.postalRegistration() },
		{ key: 'computed', label: m.conferenceAge() }
	];

	const textFilterModes: { value: TextFilterMode; label: string; needsInput: boolean }[] = [
		{ value: 'contains', label: m.filterContains(), needsInput: true },
		{ value: 'containsNot', label: m.filterContainsNot(), needsInput: true },
		{ value: 'equals', label: m.filterEquals(), needsInput: true },
		{ value: 'equalsNot', label: m.filterEqualsNot(), needsInput: true },
		{ value: 'startsWith', label: m.filterStartsWith(), needsInput: true },
		{ value: 'startsWithNot', label: m.filterStartsWithNot(), needsInput: true },
		{ value: 'isEmpty', label: m.filterIsEmpty(), needsInput: false },
		{ value: 'isNotEmpty', label: m.filterIsNotEmpty(), needsInput: false }
	];

	function modeNeedsInput(mode: TextFilterMode): boolean {
		return textFilterModes.find((m) => m.value === mode)?.needsInput ?? true;
	}

	const visibleColumns = $derived(
		table.getAllColumns().filter((col) => {
			const meta = col.columnDef.meta as ColumnMeta | undefined;
			return meta && col.getIsVisible() && col.getCanFilter();
		})
	);

	const groupedColumns = $derived.by(() => {
		const grouped = new SvelteMap<ColumnCategory, typeof visibleColumns>();
		for (const col of visibleColumns) {
			const meta = col.columnDef.meta as ColumnMeta;
			const group = grouped.get(meta.category) ?? [];
			group.push(col);
			grouped.set(meta.category, group);
		}
		return grouped;
	});

	function clearAllFilters() {
		table.resetColumnFilters();
	}

	function getTextFilterState(columnId: string): { mode: TextFilterMode; value: string } {
		const col = table.getColumn(columnId);
		const raw = col?.getFilterValue() as { mode: TextFilterMode; value: string } | undefined;
		return raw ?? { mode: 'contains', value: '' };
	}

	function setTextFilter(columnId: string, mode: TextFilterMode, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		if (!modeNeedsInput(mode)) {
			col.setFilterValue({ mode, value: '' });
		} else {
			col.setFilterValue(value ? { mode, value } : undefined);
		}
	}

	function toggleEnumValue(columnId: string, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const current = (col.getFilterValue() as string[] | undefined) ?? [];
		if (current.includes(value)) {
			const next = current.filter((v) => v !== value);
			col.setFilterValue(next.length > 0 ? next : undefined);
		} else {
			col.setFilterValue([...current, value]);
		}
	}

	function setBooleanFilter(columnId: string, value: boolean | null) {
		const col = table.getColumn(columnId);
		if (!col) return;
		col.setFilterValue(value);
	}

	function setRangeFilter(columnId: string, index: 0 | 1, value: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const current = (col.getFilterValue() as [number | null, number | null] | undefined) ?? [
			null,
			null
		];
		const numValue = value === '' ? null : Number(value);
		const next: [number | null, number | null] = [...current];
		next[index] = numValue;
		col.setFilterValue(next[0] === null && next[1] === null ? undefined : next);
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
					<i class="fa-duotone fa-filter text-xl"></i>
					{m.filters()}
				</Drawer.Title>
				<Drawer.Close class="btn btn-ghost btn-sm btn-circle">
					<i class="fa-duotone fa-xmark"></i>
				</Drawer.Close>
			</div>

			<!-- Scrollable content -->
			<div class="flex-1 overflow-y-auto px-5 pb-5" data-vaul-no-drag>
				<div class="flex flex-col gap-4">
					{#each categories as cat (cat.key)}
						{@const cols = groupedColumns.get(cat.key)}
						{#if cols && cols.length > 0}
							<div>
								<h3 class="mb-2 text-sm font-semibold text-base-content/70 uppercase">
									{cat.label}
								</h3>
								<div class="flex flex-col gap-3">
									{#each cols as col (col.id)}
										{@const colMeta = col.columnDef.meta as ColumnMeta}
										{@const header =
											typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
										<div class="form-control">
											<label class="label">
												<span class="label-text font-medium">{header}</span>
											</label>

											{#if colMeta.filterType === 'text'}
												{@const state = getTextFilterState(col.id)}
												<div class="flex gap-1">
													<select
														class="select select-sm select-bordered"
														value={state.mode}
														onchange={(e) =>
															setTextFilter(
																col.id,
																e.currentTarget.value as TextFilterMode,
																state.value
															)}
													>
														{#each textFilterModes as mode (mode.value)}
															<option value={mode.value}>{mode.label}</option>
														{/each}
													</select>
													{#if modeNeedsInput(state.mode)}
														<input
															type="text"
															class="input input-sm input-bordered grow"
															placeholder={header}
															value={state.value}
															oninput={(e) =>
																setTextFilter(col.id, state.mode, e.currentTarget.value)}
														/>
													{/if}
												</div>
											{:else if colMeta.filterType === 'enum'}
												{@const facetedValues = col.getFacetedUniqueValues()}
												{@const currentFilter =
													(col.getFilterValue() as string[] | undefined) ?? []}
												<div class="flex flex-wrap gap-1">
													{#each [...facetedValues.entries()] as [value, count] (value)}
														{@const filterKey = value == null || value === '' ? '—' : String(value)}
														{@const displayLabel = translateEnumValue(col.id, filterKey)}
														{@const isSelected = currentFilter.includes(filterKey)}
														<button
															class="badge badge-sm cursor-pointer gap-1"
															class:badge-primary={isSelected}
															class:badge-outline={!isSelected}
															onclick={() => toggleEnumValue(col.id, filterKey)}
														>
															{displayLabel}
															<span class="text-xs opacity-60">({count})</span>
														</button>
													{/each}
												</div>
											{:else if colMeta.filterType === 'boolean'}
												{@const currentValue = col.getFilterValue() as boolean | null | undefined}
												<div class="flex gap-1">
													<button
														class="badge badge-sm cursor-pointer"
														class:badge-primary={currentValue === null ||
															currentValue === undefined}
														class:badge-outline={currentValue !== null &&
															currentValue !== undefined}
														onclick={() => setBooleanFilter(col.id, null)}
													>
														{m.all()}
													</button>
													<button
														class="badge badge-sm cursor-pointer"
														class:badge-primary={currentValue === true}
														class:badge-outline={currentValue !== true}
														onclick={() => setBooleanFilter(col.id, true)}
													>
														{m.yes()}
													</button>
													<button
														class="badge badge-sm cursor-pointer"
														class:badge-primary={currentValue === false}
														class:badge-outline={currentValue !== false}
														onclick={() => setBooleanFilter(col.id, false)}
													>
														{m.no()}
													</button>
												</div>
											{:else if colMeta.filterType === 'range'}
												{@const currentRange = (col.getFilterValue() as
													| [number | null, number | null]
													| undefined) ?? [null, null]}
												{@const facetedMinMax = col.getFacetedMinMaxValues()}
												<div class="flex items-center gap-2">
													<input
														type="number"
														class="input input-sm input-bordered w-20"
														placeholder={facetedMinMax?.[0]?.toString() ?? 'Min'}
														value={currentRange[0] ?? ''}
														oninput={(e) => setRangeFilter(col.id, 0, e.currentTarget.value)}
													/>
													<span class="text-base-content/50">—</span>
													<input
														type="number"
														class="input input-sm input-bordered w-20"
														placeholder={facetedMinMax?.[1]?.toString() ?? 'Max'}
														value={currentRange[1] ?? ''}
														oninput={(e) => setRangeFilter(col.id, 1, e.currentTarget.value)}
													/>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-base-300 flex gap-2 border-t p-4">
				<button class="btn btn-ghost btn-sm w-full" onclick={clearAllFilters}>
					<i class="fa-duotone fa-filter-circle-xmark"></i>
					{m.clearAllFilters()}
				</button>
			</div>

			<!-- Drag handle -->
			<div class="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-1">
				<div class="bg-base-content/30 h-12 w-1.5 rounded-full"></div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
