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

	// Filter patterns by prefix match on raw phrase (strip optional markers for display)
	let suggestions = $derived.by(() => {
		const query = inputValue.toLowerCase().trim();
		if (!query) return [];

		return patterns
			.filter((p) => {
				// Get the display form (strip optional markers)
				const displayForm = getDisplayForm(p.raw);
				return displayForm.toLowerCase().startsWith(query);
			})
			.slice(0, 7);
	});

	// Reset selected index when suggestions change
	$effect(() => {
		if (suggestions.length > 0 && selectedIndex >= suggestions.length) {
			selectedIndex = 0;
		}
	});

	// Get display form by stripping optional markers
	function getDisplayForm(raw: string): string {
		// Remove optional prefix: "(word) phrase" -> "phrase"
		// Remove optional suffix: "phrase (word)" -> "phrase"
		// Remove placeholders: "phrase _ word" -> "phrase ... word"
		return raw
			.replace(/^\([^)]+\)\s*/, '') // Remove optional prefix
			.replace(/\s*\([^)]+\)$/, '') // Remove optional suffix
			.replace(/\s+_\s+/g, ' ... '); // Replace placeholder with ellipsis
	}

	// Get all forms of a pattern for display
	function getAllForms(raw: string): string[] {
		const forms: string[] = [];

		// Check for optional prefix
		const prefixMatch = raw.match(/^\(([^)]+)\)\s*(.+)$/);
		if (prefixMatch) {
			forms.push(prefixMatch[2]); // Without prefix
			forms.push(`${prefixMatch[1]} ${prefixMatch[2]}`); // With prefix
		}

		// Check for optional suffix
		const suffixMatch = raw.match(/^(.+)\s*\(([^)]+)\)$/);
		if (suffixMatch && !prefixMatch) {
			forms.push(suffixMatch[1].trim()); // Without suffix
			forms.push(`${suffixMatch[1].trim()} ${suffixMatch[2]}`); // With suffix
		}

		// If no optional parts, just use the base form
		if (forms.length === 0) {
			forms.push(raw.replace(/\s+_\s+/g, ' ... '));
		}

		return forms;
	}

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
					onSelect(getDisplayForm(suggestions[selectedIndex].raw));
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
		class="menu bg-base-100 rounded-box shadow-lg border border-base-300 absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto"
	>
		{#each suggestions as suggestion, i}
			<li>
				<button
					type="button"
					class="text-left"
					class:active={i === selectedIndex}
					class:bg-base-200={i === selectedIndex}
					onmousedown={(e) => {
						e.preventDefault();
						onSelect(getDisplayForm(suggestion.raw));
					}}
					onmouseenter={() => (selectedIndex = i)}
				>
					<span class="font-medium">{getDisplayForm(suggestion.raw)}</span>
					{#if suggestion.raw.includes('(') || suggestion.raw.includes('_')}
						<span class="text-xs text-base-content/50 ml-2">({suggestion.raw})</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
{/if}
