<!--
	@component
	A row of chips that narrows a list to one of its groups: "all" first, then one per option. A
	chip pressed again lifts the filter. `chip` draws an option's content.
-->
<script lang="ts" generics="T extends { key: string }">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		options: readonly T[];
		/** The key of the option the list is narrowed to; null for all */
		selected: string | null;
		onSelect: (key: string | null) => void;
		/** Names the group of chips for screen readers */
		label: string;
		/** A chip's tooltip, where its content is an abbreviation */
		titleOf?: (option: T) => string;
		chip: Snippet<[T]>;
	}

	let { options, selected, onSelect, label, titleOf, chip }: Props = $props();

	const look = (pressed: boolean) => ['btn btn-xs', pressed ? 'btn-primary' : 'btn-ghost'];
</script>

<div class="flex flex-wrap gap-1.5" role="group" aria-label={label}>
	<button
		type="button"
		class={look(selected === null)}
		aria-pressed={selected === null}
		onclick={() => onSelect(null)}
	>
		{m.all()}
	</button>
	{#each options as option (option.key)}
		{@const pressed = selected === option.key}
		<button
			type="button"
			class={look(pressed)}
			aria-pressed={pressed}
			title={titleOf?.(option)}
			onclick={() => onSelect(pressed ? null : option.key)}
		>
			{@render chip(option)}
		</button>
	{/each}
</div>
