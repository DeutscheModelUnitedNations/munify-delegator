<script lang="ts">
	import type { PhrasePattern } from '$lib/services/phraseValidation';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		patterns: PhrasePattern[];
		open: boolean;
		onClose: () => void;
		onSelect?: (phrase: string) => void;
		title?: string;
	}

	let { patterns, open = $bindable(), onClose, onSelect, title }: Props = $props();

	let searchQuery = $state('');
	let dialogEl: HTMLDialogElement;

	// Expand a pattern into all possible phrase variations
	function expandPattern(raw: string): string[] {
		const variations: string[] = [];

		// Check for optional prefix: "(prefix) rest"
		const prefixMatch = raw.match(/^\(([^)]+)\)\s*(.+)$/);
		if (prefixMatch) {
			const prefix = prefixMatch[1];
			const rest = prefixMatch[2];

			// Check if rest also has optional suffix
			const suffixMatch = rest.match(/^(.+?)\s*\(([^)]+)\)$/);
			if (suffixMatch) {
				const base = suffixMatch[1].trim().replace(/\s+_\s+/g, ' ... ');
				const suffix = suffixMatch[2];
				// All 4 combinations: with/without prefix × with/without suffix
				variations.push(base);
				variations.push(`${base} ${suffix}`);
				variations.push(`${prefix} ${base}`);
				variations.push(`${prefix} ${base} ${suffix}`);
			} else {
				// Just prefix optional
				const base = rest.replace(/\s+_\s+/g, ' ... ');
				variations.push(base);
				variations.push(`${prefix} ${base}`);
			}
			return variations;
		}

		// Check for optional suffix only: "base (suffix)"
		const suffixMatch = raw.match(/^(.+?)\s*\(([^)]+)\)$/);
		if (suffixMatch) {
			const base = suffixMatch[1].trim().replace(/\s+_\s+/g, ' ... ');
			const suffix = suffixMatch[2];
			variations.push(base);
			variations.push(`${base} ${suffix}`);
			return variations;
		}

		// No optional parts - just return the base form
		variations.push(raw.replace(/\s+_\s+/g, ' ... '));
		return variations;
	}

	// Expand all patterns into their variations
	let allPhrases = $derived.by(() => {
		const phrases: string[] = [];
		for (const pattern of patterns) {
			phrases.push(...expandPattern(pattern.raw));
		}
		// Remove duplicates and sort alphabetically
		return [...new Set(phrases)].sort((a, b) => a.localeCompare(b, 'de'));
	});

	// Filter phrases based on search query
	let filteredPhrases = $derived(
		allPhrases.filter((phrase) => phrase.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function handleSelect(phrase: string) {
		onSelect?.(phrase);
		onClose();
	}

	// Handle dialog close via backdrop or escape
	function handleDialogClick(e: MouseEvent) {
		if (e.target === dialogEl) {
			onClose();
		}
	}

	$effect(() => {
		if (open) {
			searchQuery = '';
		}
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog class="modal" class:modal-open={open} bind:this={dialogEl} onclick={handleDialogClick}>
	<div class="modal-box max-w-lg">
		<div class="flex items-center justify-between mb-4">
			<h3 class="font-bold text-lg">
				<i class="fa-solid fa-book mr-2"></i>
				{title ?? m.phraseLookupTitle()}
			</h3>
			<button
				type="button"
				class="btn btn-sm btn-circle btn-ghost"
				onclick={onClose}
				aria-label={m.close()}
			>
				<i class="fa-solid fa-xmark"></i>
			</button>
		</div>

		<input
			type="text"
			placeholder={m.phraseLookupSearch()}
			bind:value={searchQuery}
			class="input input-bordered w-full"
		/>

		<ul class="mt-4 max-h-72 overflow-y-auto space-y-1">
			{#each filteredPhrases as phrase}
				<li>
					<button
						type="button"
						class="btn btn-ghost btn-sm justify-start w-full text-left"
						onclick={() => handleSelect(phrase)}
					>
						{phrase}
					</button>
				</li>
			{:else}
				<li class="text-center text-base-content/50 py-4">
					{m.phraseLookupNoResults()}
				</li>
			{/each}
		</ul>

		<div class="modal-action">
			<button type="button" class="btn" onclick={onClose}>{m.close()}</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop bg-black/30">
		<button type="button" onclick={onClose}>close</button>
	</form>
</dialog>
