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

	// Filter patterns based on search query
	let filteredPatterns = $derived(
		patterns.filter((p) => p.raw.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	// Get display form by stripping optional markers
	function getDisplayForm(raw: string): string {
		return raw
			.replace(/^\([^)]+\)\s*/, '') // Remove optional prefix
			.replace(/\s*\([^)]+\)$/, '') // Remove optional suffix
			.replace(/\s+_\s+/g, ' ... '); // Replace placeholder with ellipsis
	}

	// Get all variant forms of a pattern
	function getVariants(raw: string): string[] {
		const variants: string[] = [];

		// Check for optional prefix
		const prefixMatch = raw.match(/^\(([^)]+)\)\s*(.+)$/);
		if (prefixMatch) {
			const base = prefixMatch[2].replace(/\s*\([^)]+\)$/, '').replace(/\s+_\s+/g, ' ... ');
			variants.push(base);
			variants.push(`${prefixMatch[1]} ${base}`);
		}

		// Check for optional suffix
		const suffixMatch = raw.match(/^(.+?)\s*\(([^)]+)\)$/);
		if (suffixMatch && !prefixMatch) {
			const base = suffixMatch[1].replace(/^\([^)]+\)\s*/, '').replace(/\s+_\s+/g, ' ... ');
			variants.push(base);
			variants.push(`${base} ${suffixMatch[2]}`);
		}

		// If no optional parts, just use the display form
		if (variants.length === 0) {
			variants.push(getDisplayForm(raw));
		}

		return variants;
	}

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
			<button type="button" class="btn btn-sm btn-circle btn-ghost" onclick={onClose} aria-label={m.close()}>
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
			{#each filteredPatterns as pattern (pattern.raw)}
				{@const variants = getVariants(pattern.raw)}
				<li>
					<button
						type="button"
						class="btn btn-ghost btn-sm justify-start w-full text-left h-auto py-2"
						onclick={() => handleSelect(getDisplayForm(pattern.raw))}
					>
						<div class="flex flex-col items-start gap-0.5">
							<span class="font-medium">{variants[0]}</span>
							{#if variants.length > 1}
								<span class="text-xs text-base-content/50">
									{m.phraseLookupAlternative()}: {variants.slice(1).join(', ')}
								</span>
							{/if}
							{#if pattern.raw.includes('_')}
								<span class="text-xs text-base-content/50">
									{m.phraseLookupPlaceholder()}
								</span>
							{/if}
						</div>
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
