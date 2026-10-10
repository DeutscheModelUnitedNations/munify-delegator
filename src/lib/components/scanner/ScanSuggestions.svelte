<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { UserSuggestion } from './suggestions';

	interface Props {
		/** Id of the list, for the input's `aria-controls` */
		id: string;
		suggestions: UserSuggestion[];
		highlighted: number;
		onpick: (userId: string) => void;
	}

	let { id, suggestions, highlighted = $bindable(), onpick }: Props = $props();
</script>

{#if suggestions.length > 0}
	<ul
		{id}
		role="listbox"
		class="menu absolute top-full right-0 left-0 z-20 mt-1 w-full flex-nowrap rounded-box border border-base-300 bg-base-100 p-1 shadow-lg"
	>
		{#each suggestions as suggestion, index (suggestion.id)}
			<li role="option" aria-selected={index === highlighted}>
				<button
					type="button"
					class="flex items-center gap-3 {index === highlighted ? 'menu-active' : ''}"
					onmouseenter={() => (highlighted = index)}
					onclick={() => onpick(suggestion.id)}
				>
					<span class="font-semibold">{suggestion.name}</span>
					<span class="text-base-content/60 truncate text-sm">{suggestion.email}</span>
					{#if !suggestion.inConference}
						<span class="badge badge-ghost badge-sm ml-auto">{m.notInConference()}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
{/if}
