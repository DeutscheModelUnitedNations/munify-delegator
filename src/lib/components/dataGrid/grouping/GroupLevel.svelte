<script lang="ts" generics="Row">
	import { orderGroups } from '#lib/dataGrid/grouping';
	import type { GroupPath } from '#lib/dataGrid/stateSchema';
	import GroupLevel from './GroupLevel.svelte';
	import GroupNode from './GroupNode.svelte';
	import { groupLabel } from './groupLabel';
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
	const revision = $derived(props.grid.revision);
	const read = $derived(await props.source.groups({ query, search, revision }));
	const fetched = $derived(read());
	const desc = $derived(
		props.grid.applied.sorting.find((entry) => entry.id === groupBy?.column)?.desc ?? false
	);
	// labelled here, where the column is known to exist
	const groups = $derived(
		column && groupBy
			? orderGroups({ groups: fetched, column, desc }).map((group) => ({
					group,
					label: groupLabel({ column, groupBy, value: group.value })
				}))
			: []
	);
	const columnLabel = $derived(column?.label ?? '');
	const deeper = $derived(level + 1 < props.grid.applied.grouping.length);
</script>

{#snippet nextLevel(path: GroupPath)}
	<GroupLevel {...props} {path} />
{/snippet}

{#each groups as { group, label } (group.value)}
	<GroupNode {...props} {group} {columnLabel} {label} deeper={deeper ? nextLevel : undefined} />
{/each}
