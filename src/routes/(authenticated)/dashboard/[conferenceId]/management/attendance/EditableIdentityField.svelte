<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		/** What the input starts with each time editing begins. */
		initialValue: string;
		type?: 'text' | 'date';
		fullWidth?: boolean;
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

	async function save() {
		await onSave(value);
		editing = false;
	}
</script>

{#if readonly}
	<div class="py-1 text-left {fullWidth ? 'w-full' : ''}">{@render children()}</div>
{:else if editing}
	<div class="join {fullWidth ? 'w-full' : ''}">
		<input
			class="input join-item input-lg {fullWidth ? 'w-full' : ''}"
			bind:value
			{type}
			onkeydown={(e) => {
				if (e.key === 'Enter') save();
				if (e.key === 'Escape') editing = false;
			}}
		/>
		<button class="btn btn-square btn-lg join-item" onclick={save} aria-label={m.save()}>
			<i class="fa-sharp-duotone fa-solid fa-save"></i>
		</button>
		<button
			class="btn btn-square btn-lg btn-error join-item"
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
	>
		{@render children()}
		<i
			class="fa-sharp-duotone fa-solid fa-pen-to-square ml-2 text-sm opacity-50 transition-opacity group-hover:opacity-100"
		></i>
	</button>
{/if}
