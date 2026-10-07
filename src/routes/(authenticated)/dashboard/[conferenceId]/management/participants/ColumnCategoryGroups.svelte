<script
	lang="ts"
	generics="E extends { col: { id: string; columnDef: { header?: unknown } }; meta: { category: ColumnCategory } }"
>
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { m } from '$lib/paraglide/messages';
	import type { ColumnCategory } from './types';

	interface Props {
		/** The columns to list, each with its meta */
		entries: E[];
		/** Classes for the list of one category */
		listClass: string;
		/** Classes for the wrapper of one category */
		groupClass?: string;
		/** One column, with its header text */
		item: Snippet<[entry: E, header: string]>;
	}

	let { entries, listClass, groupClass = '', item }: Props = $props();

	const categories: { key: ColumnCategory; label: string }[] = [
		{ key: 'personal', label: m.personalData() },
		{ key: 'role', label: m.participation() },
		{ key: 'status', label: m.status() },
		{ key: 'computed', label: m.computedValues() }
	];

	const groupedColumns = $derived.by(() => {
		const grouped = new SvelteMap<ColumnCategory, E[]>();
		for (const entry of entries) {
			const group = grouped.get(entry.meta.category) ?? [];
			group.push(entry);
			grouped.set(entry.meta.category, group);
		}
		return grouped;
	});

	function headerOf({ col }: E): string {
		return typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id;
	}
</script>

{#each categories as cat (cat.key)}
	{@const cols = groupedColumns.get(cat.key)}
	{#if cols && cols.length > 0}
		<section class={groupClass}>
			<h3 class="mb-3 text-xs font-semibold tracking-wider text-base-content/60 uppercase">
				{cat.label}
			</h3>
			<div class={listClass}>
				{#each cols as entry (entry.col.id)}
					{@render item(entry, headerOf(entry))}
				{/each}
			</div>
		</section>
	{/if}
{/each}
