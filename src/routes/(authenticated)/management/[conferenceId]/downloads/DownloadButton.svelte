<script lang="ts">
	interface Props {
		title: string;
		icon?: string;
		/** Shows the spinner; a promise returned by `onclick` shows it on its own until it settles */
		loading?: boolean;
		disabled?: boolean;
		onclick: () => void | Promise<void>;
	}

	let {
		title,
		icon = 'fas fa-file-csv',
		loading = false,
		disabled = false,
		onclick
	}: Props = $props();

	let running = $state(false);
	const busy = $derived(loading || running);

	async function handleClick() {
		const result = onclick();
		if (!(result instanceof Promise)) return;
		running = true;
		try {
			await result;
		} finally {
			running = false;
		}
	}
</script>

<button
	class="btn btn-outline btn-sm gap-2 justify-start h-auto py-2 min-h-0"
	disabled={disabled || busy}
	onclick={handleClick}
>
	{#if busy}
		<span class="loading loading-spinner loading-xs"></span>
	{:else}
		<i class="{icon} text-sm opacity-70"></i>
	{/if}
	<span class="truncate text-left">{title}</span>
</button>
