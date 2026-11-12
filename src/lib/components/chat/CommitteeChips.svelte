<!--
	@component
	The committees of the people to write to, as chips that narrow the picker to one of them without
	typing; the people seated without a committee are a chip of their own.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { OTHER_GROUP } from './contactGroups';

	interface Props {
		groups: readonly { key: string; label: string; name: string }[];
		/** The key of the group the picker is narrowed to; null for all */
		selected: string | null;
		onSelect: (key: string | null) => void;
	}

	let { groups, selected, onSelect }: Props = $props();
</script>

<div class="flex flex-wrap gap-1.5" role="group" aria-label={m.chatFilterByCommittee()}>
	<button
		type="button"
		class={['btn btn-xs', selected === null ? 'btn-primary' : 'btn-ghost']}
		aria-pressed={selected === null}
		onclick={() => onSelect(null)}
	>
		{m.all()}
	</button>
	{#each groups as group (group.key)}
		<button
			type="button"
			class={['btn btn-xs', selected === group.key ? 'btn-primary' : 'btn-ghost']}
			aria-pressed={selected === group.key}
			title={group.name}
			onclick={() => onSelect(selected === group.key ? null : group.key)}
		>
			{group.key === OTHER_GROUP ? m.chatGroupWithoutCommittee() : group.label}
		</button>
	{/each}
</div>
