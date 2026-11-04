<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import type { GroupCount } from '#lib/dataGrid/grouping';
	import type { GroupBy, GroupPath } from '#lib/dataGrid/stateSchema';
	import type { GridColumn } from '../gridColumn';
	import GroupHeaderRow from './GroupHeaderRow.svelte';
	import { groupLabel } from './groupLabel';
	import type { GroupProps } from './groupProps';
	import GroupRows from './GroupRows.svelte';
	import LoadingRow from './LoadingRow.svelte';

	/**
	 * One group: its header, and when open what it holds - the next level of groups, or at the
	 * innermost level its rows - behind a boundary of its own, so opening it waits for nothing else.
	 */
	interface Props extends GroupProps<Row> {
		group: GroupCount;
		column: GridColumn<Row>;
		groupBy: GroupBy;
		/** The next level of groups, where one follows (`GroupLevel` hands itself in) */
		deeper?: Snippet<[GroupPath]>;
	}

	let { group, column, groupBy, deeper, ...props }: Props = $props();

	const groupPath = $derived([...props.path, group.value]);
	const open = $derived(props.grid.isGroupOpen(groupPath));
</script>

{#snippet loading()}
	<LoadingRow colspan={props.colspan} level={groupPath.length} />
{/snippet}

<GroupHeaderRow
	colspan={props.colspan}
	level={props.path.length}
	columnLabel={column.label}
	label={groupLabel({ column, groupBy, value: group.value })}
	count={group.count}
	{open}
	ontoggle={() => props.grid.toggleGroup(groupPath)}
/>
{#if open}
	<svelte:boundary pending={browser ? loading : undefined}>
		{#if deeper}
			{@render deeper(groupPath)}
		{:else}
			<GroupRows {...props} path={groupPath} />
		{/if}
	</svelte:boundary>
{/if}
