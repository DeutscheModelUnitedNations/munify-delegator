<script lang="ts">
	import { type PhrasePattern, expandPattern } from '$lib/services/phraseValidation';

	interface Props {
		patterns: PhrasePattern[];
		inputValue: string;
		visible: boolean;
		onSelect: (phrase: string) => void;
		onClose: () => void;
	}

	let { patterns, inputValue, visible, onSelect, onClose }: Props = $props();

	let selectedIndex = $state(0);

	// Expand all patterns into their variations
	let allPhrases = $derived.by(() => {
		const phrases: string[] = [];
		for (const pattern of patterns) {
			phrases.push(...expandPattern(pattern.raw));
		}
		// Remove duplicates and sort
		return [...new Set(phrases)].sort((a, b) => a.localeCompare(b, 'de'));
	});

	// Filter phrases by prefix match
	let suggestions = $derived.by(() => {
		const query = inputValue.toLowerCase().trim();
		if (!query) return [];

		return allPhrases.filter((phrase) => phrase.toLowerCase().startsWith(query)).slice(0, 7);
	});

	// Reset selected index when suggestions change
	$effect(() => {
		if (suggestions.length > 0 && selectedIndex >= suggestions.length) {
			selectedIndex = 0;
		}
	});

	// Handle keyboard navigation - returns true if event was handled
	export function handleKeyDown(e: KeyboardEvent): boolean {
		if (!visible || suggestions.length === 0) return false;

		switch (e.key) {
			case 'ArrowDown':
				selectedIndex = (selectedIndex + 1) % suggestions.length;
				return true;
			case 'ArrowUp':
				selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
				return true;
			case 'Enter':
				if (suggestions[selectedIndex]) {
					onSelect(suggestions[selectedIndex]);
					return true;
				}
				return false;
			case 'Escape':
				onClose();
				return true;
			default:
				return false;
		}
	}
</script>

{#if visible && suggestions.length > 0}
	<ul
		class="menu bg-base-100 rounded-box shadow-lg border border-base-300 absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto flex-nowrap"
	>
		{#each suggestions as phrase, i}
			<li>
				<button
					type="button"
					class="text-left"
					class:active={i === selectedIndex}
					class:bg-base-200={i === selectedIndex}
					onmousedown={(e) => {
						e.preventDefault();
						onSelect(phrase);
					}}
					onmouseenter={() => (selectedIndex = i)}
				>
					{phrase}
				</button>
			</li>
		{/each}
	</ul>
{/if}
