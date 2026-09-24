<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Modal from '$lib/components/Modal.svelte';

	interface Props {
		open: boolean;
		placeholders: string[];
		onConfirm: (values: Record<string, string>) => void;
		onCancel: () => void;
	}

	let { open = $bindable(), placeholders, onConfirm, onCancel }: Props = $props();

	let values = $state<Record<string, string>>({});
	let inputRefs = $state<HTMLInputElement[]>([]);

	// Initialize values when placeholders change
	$effect(() => {
		if (placeholders) {
			values = Object.fromEntries(placeholders.map((p) => [p, '']));
			inputRefs = [];
		}
	});

	// Action to focus element on mount (only if shouldFocus is true)
	function focusOnMount(node: HTMLInputElement, shouldFocus: boolean) {
		if (!shouldFocus) return;
		// Use requestAnimationFrame to ensure we're after the browser paint
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				node.focus();
			});
		});
	}

	function handleConfirm() {
		onConfirm(values);
		open = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (index < placeholders.length - 1) {
				// Move to next input
				inputRefs[index + 1]?.focus();
			} else {
				// Last input - submit
				handleConfirm();
			}
		}
	}
</script>

<Modal bind:open title={m.fillPlaceholders()} onclose={handleCancel}>
	<div class="flex flex-col gap-4">
		<p class="text-sm text-base-content/70">{m.fillPlaceholdersDescription()}</p>

		{#each placeholders as placeholder, index}
			<fieldset class="fieldset bg-base-200 border-base-300 rounded-box border p-4">
				<legend class="fieldset-legend text-primary">{placeholder}</legend>
				<input
					id="placeholder-{placeholder}"
					type="text"
					class="input input-bordered w-full"
					bind:this={inputRefs[index]}
					bind:value={values[placeholder]}
					{placeholder}
					onkeydown={(e) => handleKeydown(e, index)}
					use:focusOnMount={index === 0}
				/>
			</fieldset>
		{/each}
	</div>

	{#snippet action()}
		<div class="flex gap-2">
			<button class="btn" onclick={handleCancel}>{m.cancel()}</button>
			<button class="btn btn-primary" onclick={handleConfirm}>
				<i class="fa-solid fa-check"></i>
				{m.insertSnippet()}
			</button>
		</div>
	{/snippet}
</Modal>
