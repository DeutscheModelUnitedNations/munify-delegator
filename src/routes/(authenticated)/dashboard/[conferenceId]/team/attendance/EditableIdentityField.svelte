<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		/** What the input starts with each time editing begins. */
		initialValue: string;
		type?: 'text' | 'date';
		fullWidth?: boolean;
		/** The small size fits into a list row; the large one is the scan result's. */
		size?: 'sm' | 'lg';
		/** What the button that starts editing says to assistive technology. */
		label?: string;
		/** Shows the value without the means to change it. */
		readonly?: boolean;
		onSave: (value: string) => Promise<void>;
		/** The value as shown while not editing. */
		children: Snippet;
	}

	let {
		initialValue,
		type = 'text',
		fullWidth = false,
		size = 'lg',
		label,
		readonly = false,
		onSave,
		children
	}: Props = $props();

	let editing = $state(false);
	let value = $state('');

	function startEditing() {
		value = initialValue;
		editing = true;
	}

	const inputSize = $derived(size === 'sm' ? 'input-sm' : 'input-lg');
	const buttonSize = $derived(size === 'sm' ? 'btn-sm' : 'btn-lg');

	async function save() {
		try {
			await onSave(value);
			editing = false;
		} catch {
			// `onSave` reports the failure; the field stays open to try again
		}
	}
</script>

{#if readonly}
	<div class="py-1 text-left {fullWidth ? 'w-full' : ''}">{@render children()}</div>
{:else if editing}
	<div class="join {fullWidth ? 'w-full' : ''}">
		<input
			class="input join-item {inputSize} {fullWidth ? 'w-full' : ''}"
			bind:value
			{type}
			onkeydown={(e) => {
				if (e.key === 'Enter') save();
				if (e.key === 'Escape') editing = false;
			}}
		/>
		<button class="btn btn-square {buttonSize} join-item" onclick={save} aria-label={m.save()}>
			<i class="fa-sharp-duotone fa-solid fa-save"></i>
		</button>
		<button
			class="btn btn-square {buttonSize} btn-error join-item"
			onclick={() => (editing = false)}
			aria-label={m.cancel()}
		>
			<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
		</button>
	</div>
{:else}
	<button
		class="btn btn-ghost group h-auto justify-start px-0 py-1 text-left {fullWidth ? 'w-full' : ''}"
		onclick={startEditing}
		aria-label={label}
	>
		{@render children()}
		<!-- On a phone the value itself is the obvious thing to tap -->
		<i
			class="fa-sharp-duotone fa-solid fa-pen-to-square ml-2 hidden text-sm opacity-50 transition-opacity group-hover:opacity-100 md:inline-block"
		></i>
	</button>
{/if}
