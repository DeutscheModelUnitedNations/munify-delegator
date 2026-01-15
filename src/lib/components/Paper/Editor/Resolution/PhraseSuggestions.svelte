<script lang="ts">
	import type { PhrasePattern } from '$lib/services/phraseValidation';

	interface Props {
		patterns: PhrasePattern[];
		inputValue: string;
		visible: boolean;
		onSelect: (phrase: string) => void;
		onClose: () => void;
	}

	let { patterns, inputValue, visible, onSelect, onClose }: Props = $props();

	let selectedIndex = $state(0);

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
		class="menu bg-base-100 rounded-box shadow-lg border border-base-300 absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto overflow-x-auto"
	>
		{#each suggestions as phrase, i}
			<li>
				<button
					type="button"
					class="text-left whitespace-nowrap"
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
