<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import {
		parsePreambleText,
		parseOperativeText,
		countOperativeClauses,
		type ParsedOperativeClause
	} from '$lib/services/resolutionParser';

	interface Props {
		open: boolean;
		type: 'preamble' | 'operative';
		onClose: () => void;
		onImport: (clauses: string[] | ParsedOperativeClause[]) => void;
	}

	let { open = $bindable(), type, onClose, onImport }: Props = $props();

	let inputText = $state('');
	let dialogEl: HTMLDialogElement;
	let copied = $state(false);

	function copyPrompt() {
		const prompt =
			type === 'preamble'
				? m.resolutionImportLLMPromptPreamble()
				: m.resolutionImportLLMPromptOperative();
		navigator.clipboard.writeText(prompt);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// Parse the input text based on type
	let parsedPreamble = $derived(type === 'preamble' ? parsePreambleText(inputText) : []);
	let parsedOperative = $derived(type === 'operative' ? parseOperativeText(inputText) : []);

	// Count clauses for display
	let clauseCount = $derived.by(() => {
		if (type === 'preamble') {
			return { total: parsedPreamble.length, main: parsedPreamble.length, sub: 0 };
		} else {
			const counts = countOperativeClauses(parsedOperative);
			return { total: counts.main + counts.sub, main: counts.main, sub: counts.sub };
		}
	});

	function handleImport() {
		if (type === 'preamble') {
			onImport(parsedPreamble);
		} else {
			onImport(parsedOperative);
		}
		inputText = '';
		onClose();
	}

	function handleDialogClick(e: MouseEvent) {
		if (e.target === dialogEl) {
			onClose();
		}
	}

	$effect(() => {
		if (open) {
			inputText = '';
		}
	});

	// Truncate text for preview
	function truncate(text: string, maxLength: number = 60): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog class="modal" class:modal-open={open} bind:this={dialogEl} onclick={handleDialogClick}>
	<div class="modal-box max-w-2xl">
		<div class="flex items-center justify-between mb-4">
			<h3 class="font-bold text-lg">
				<i class="fa-solid fa-file-import mr-2"></i>
				{type === 'preamble' ? m.resolutionImportPreamble() : m.resolutionImportOperative()}
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

		<p class="text-sm text-base-content/70 mb-3">
			{type === 'preamble' ? m.resolutionImportHintPreamble() : m.resolutionImportHintOperative()}
		</p>

		<!-- Tips for best results -->
		<details class="collapse collapse-arrow bg-base-200 mb-4">
			<summary class="collapse-title text-sm font-medium py-2 min-h-0">
				<i class="fa-solid fa-lightbulb text-warning mr-2"></i>
				{m.resolutionImportTipsTitle()}
			</summary>
			<div class="collapse-content text-sm">
				<ul class="list-disc list-inside space-y-1 text-base-content/70">
					{#if type === 'preamble'}
						<li>{m.resolutionImportTipsPreamble1()}</li>
						<li>{m.resolutionImportTipsPreamble2()}</li>
						<li>{m.resolutionImportTipsPreamble3()}</li>
					{:else}
						<li>{m.resolutionImportTipsOperative1()}</li>
						<li>{m.resolutionImportTipsOperative2()}</li>
						<li>{m.resolutionImportTipsOperative3()}</li>
						<li>{m.resolutionImportTipsOperative4()}</li>
					{/if}
				</ul>
			</div>
		</details>

		<!-- LLM formatting instructions -->
		<details class="collapse collapse-arrow bg-base-200 mb-4">
			<summary class="collapse-title text-sm font-medium py-2 min-h-0">
				<i class="fa-solid fa-robot text-info mr-2"></i>
				{m.resolutionImportLLMTitle()}
			</summary>
			<div class="collapse-content text-sm">
				<p class="text-base-content/70 mb-3">
					{m.resolutionImportLLMInstructions()}
				</p>
				<div class="relative">
					<pre
						class="bg-base-300 rounded-lg p-3 pr-28 text-xs whitespace-pre-wrap overflow-x-auto max-h-48">{type ===
					'preamble'
						? m.resolutionImportLLMPromptPreamble()
						: m.resolutionImportLLMPromptOperative()}</pre>
					<button
						type="button"
						class="btn btn-sm btn-ghost absolute top-2 right-2"
						onclick={copyPrompt}
					>
						<i class="fa-solid {copied ? 'fa-check text-success' : 'fa-copy'}"></i>
						{copied ? m.resolutionImportLLMCopied() : m.resolutionImportLLMCopyPrompt()}
					</button>
				</div>
			</div>
		</details>

		<textarea
			bind:value={inputText}
			placeholder={type === 'preamble'
				? 'anerkennend die Bemühungen...,\nbetonend die Notwendigkeit...,\n...'
				: '1. fordert alle Mitgliedstaaten auf...;\n   I. nationale Aktionspläne...;\n   II. internationale Zusammenarbeit...;\n2. bittet den Generalsekretär...'}
			class="textarea textarea-bordered w-full min-h-40 font-mono text-sm"
			rows="8"
		></textarea>

		{#if clauseCount.total > 0}
			<div class="mt-4">
				<div class="text-sm font-medium mb-2">
					{m.resolutionImportPreview({ count: clauseCount.total })}
					{#if type === 'operative' && clauseCount.sub > 0}
						<span class="text-base-content/60">
							({clauseCount.main} {m.resolutionOperativeClauses()}, {clauseCount.sub}
							{m.resolutionSubClauses()})
						</span>
					{/if}
				</div>
				<ul
					class="bg-base-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 text-sm font-mono"
				>
					{#if type === 'preamble'}
						{#each parsedPreamble as clause, i}
							<li class="flex items-start gap-2">
								<i class="fa-solid fa-check text-success mt-1 shrink-0"></i>
								<span class="text-base-content/80">{truncate(clause)}</span>
							</li>
						{/each}
					{:else}
						{#each parsedOperative as clause, i}
							<li class="flex items-start gap-2">
								<span class="font-bold text-primary shrink-0">{i + 1}.</span>
								<div>
									<span class="text-base-content/80">{truncate(clause.content)}</span>
									{#if clause.subClauses && clause.subClauses.length > 0}
										<span class="text-base-content/50 text-xs ml-1">
											(+{clause.subClauses.length} sub)
										</span>
									{/if}
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</div>
		{/if}

		<div class="modal-action">
			<button type="button" class="btn" onclick={onClose}>{m.cancel()}</button>
			<button
				type="button"
				class="btn btn-primary"
				onclick={handleImport}
				disabled={clauseCount.total === 0}
			>
				<i class="fa-solid fa-file-import"></i>
				{m.resolutionImportButton({ count: clauseCount.total })}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop bg-black/30">
		<button type="button" onclick={onClose}>close</button>
	</form>
</dialog>
