<!--
	@component
	The committees of the people to write to, as chips that narrow the picker to one of them without
	typing; the people seated without a committee are a chip of their own.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import FilterChips from './FilterChips.svelte';
	import { OTHER_GROUP } from './contactGroups';

	interface Props {
		groups: readonly { key: string; label: string; name: string }[];
		/** The key of the group the picker is narrowed to; null for all */
		selected: string | null;
		onSelect: (key: string | null) => void;
	}

	let { groups, selected, onSelect }: Props = $props();
</script>

<FilterChips
	options={groups}
	{selected}
	{onSelect}
	label={m.chatFilterByCommittee()}
	titleOf={(group) => group.name}
>
	{#snippet chip(group)}
		{group.key === OTHER_GROUP ? m.chatGroupWithoutCommittee() : group.label}
	{/snippet}
</FilterChips>
