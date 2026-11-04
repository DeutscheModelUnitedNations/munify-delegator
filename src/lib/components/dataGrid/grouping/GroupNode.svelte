<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import type { GroupCount } from '#lib/dataGrid/grouping';
	import type { GroupPath } from '#lib/dataGrid/stateSchema';
	import GroupHeaderRow from './GroupHeaderRow.svelte';
	import type { GroupProps } from './groupProps';
	import GroupRows from './GroupRows.svelte';
	import LoadingRow from './LoadingRow.svelte';

	/**
	 * One group: its header, and when open what it holds - the next level of groups, or at the
	 * innermost level its rows - behind a boundary of its own, so opening it waits for nothing else.
	 */
	interface Props extends GroupProps<Row> {
		group: GroupCount;
		/**
		 * What the header says: the grouping column's name and the group's. Plain text worked out by
		 * `GroupLevel`, which knows the column: while a live update replaces the page's columns, a
		 * group being torn down could otherwise read a column that is gone for a moment.
		 */
		columnLabel: string;
		label: string;
		/** The next level of groups, where one follows (`GroupLevel` hands itself in) */
		deeper?: Snippet<[GroupPath]>;
	}

	let { group, columnLabel, label, deeper, ...props }: Props = $props();

	const groupPath = $derived([...props.path, group.value]);
	const open = $derived(props.grid.isGroupOpen(groupPath));
</script>

{#snippet loading()}
	<LoadingRow colspan={props.colspan} level={groupPath.length} />
{/snippet}

<GroupHeaderRow
	colspan={props.colspan}
	level={props.path.length}
	{columnLabel}
	{label}
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
