<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(''),
		inputElem = $bindable(),
		busy = false,
		onsubmit,
		...inputProps
	}: {
		value?: string;
		inputElem?: HTMLInputElement;
		/** Shows a spinner while a search is running. */
		busy?: boolean;
		onsubmit: () => void;
	} & Omit<
		HTMLInputAttributes,
		'value' | 'type' | 'class' | 'autocomplete' | 'onsubmit'
	> = $props();
</script>

<form
	class="join w-full"
	onsubmit={(e) => {
		e.preventDefault();
		onsubmit();
	}}
>
	<label class="input join-item w-full">
		<i aria-hidden="true" class="ph-duotone ph-magnifying-glass text-base-content/50"></i>
		<input
			{...inputProps}
			type="text"
			bind:this={inputElem}
			bind:value
			class="grow"
			autocomplete="off"
		/>
		{#if busy}
			<span class="loading loading-xs loading-spinner"></span>
		{/if}
	</label>
	<button type="submit" class="btn btn-primary join-item" aria-label={m.search()}>
		<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
	</button>
</form>
