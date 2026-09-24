<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SnippetItem } from '../extensions/SnippetSuggestion';

	interface Props {
		snippets: SnippetItem[];
		onSelect: (snippet: SnippetItem) => void;
		disabled?: boolean;
	}

	let { snippets, onSelect, disabled = false }: Props = $props();

	function handleSelect(snippet: SnippetItem) {
		onSelect(snippet);
		// Close the dropdown by blurring the active element
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	}
</script>

<li class="md:tooltip" data-tip={m.snippets()}>
	<div class="dropdown dropdown-end">
		<button tabindex="0" type="button" class="flex items-center gap-1 cursor-pointer" {disabled}>
			<i class="fa-duotone fa-bookmark"></i>
			<span class="md:hidden">{m.snippets()}</span>
			<i class="fa-solid fa-chevron-down text-[10px] opacity-60"></i>
		</button>

		<ul
			tabindex="0"
			class="dropdown-content menu bg-base-100 rounded-box shadow-lg z-[100] w-56 p-2 border border-base-300 mt-2"
		>
			{#if snippets.length === 0}
				<li class="disabled">
					<span class="text-base-content/50 text-sm cursor-default">
						{m.noSnippetsYet()}
					</span>
				</li>
			{:else}
				{#each snippets as snippet}
					<li>
						<button type="button" class="cursor-pointer" onclick={() => handleSelect(snippet)}>
							<i class="fa-solid fa-bookmark text-primary"></i>
							<span class="truncate">{snippet.name}</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</li>
