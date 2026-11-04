<script lang="ts" generics="Row">
	import { orderGroups } from '#lib/dataGrid/grouping';
	import type { GroupPath } from '#lib/dataGrid/stateSchema';
	import GroupLevel from './GroupLevel.svelte';
	import GroupNode from './GroupNode.svelte';
	import type { GroupProps } from './groupProps';

	/**
	 * One level of a grouped table below `path`: its groups, in order, each a `GroupNode`. A level
	 * asks only for its own groups; a closed group asks for nothing.
	 */
	let props: GroupProps<Row> = $props();

	const level = $derived(props.path.length);
	const groupBy = $derived(props.grid.applied.grouping[level]);
	const column = $derived(groupBy ? props.grid.column(groupBy.column) : undefined);
	const query = $derived(props.grid.query(props.path));
	const search = $derived(props.grid.search);
	const read = $derived(await props.source.groups({ query, search }));
	const fetched = $derived(read());
	const desc = $derived(
		props.grid.applied.sorting.find((entry) => entry.id === groupBy?.column)?.desc ?? false
	);
	const groups = $derived(column ? orderGroups({ groups: fetched, column, desc }) : []);
	const deeper = $derived(level + 1 < props.grid.applied.grouping.length);
</script>

{#snippet nextLevel(path: GroupPath)}
	<GroupLevel {...props} {path} />
{/snippet}

{#if column && groupBy}
	{#each groups as group (group.value)}
		<GroupNode {...props} {group} {column} {groupBy} deeper={deeper ? nextLevel : undefined} />
	{/each}
{/if}
