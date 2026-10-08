<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/**
	 * Covers its (relatively positioned) parent while a change to it is on its way: a card being
	 * moved (`sm`), or the whole board during an automatic assignment (`lg`), whose spinner stays in
	 * view near the top however tall the board is.
	 */
	interface Props {
		size?: 'sm' | 'lg';
	}

	let { size = 'sm' }: Props = $props();
</script>

<div
	class="bg-base-100/60 absolute inset-0 z-10 grid rounded-lg {size === 'lg'
		? 'items-start justify-items-center pt-24'
		: 'place-items-center'}"
	role="status"
	aria-live="polite"
>
	{#if size === 'lg'}
		<div class="bg-base-100 rounded-box sticky top-24 flex items-center gap-3 px-5 py-3 shadow-lg">
			<span class="loading loading-spinner loading-md text-primary"></span>
			<span class="font-semibold">{m.saving()}</span>
		</div>
	{:else}
		<span class="loading loading-spinner loading-md text-primary"></span>
		<span class="sr-only">{m.saving()}</span>
	{/if}
</div>
