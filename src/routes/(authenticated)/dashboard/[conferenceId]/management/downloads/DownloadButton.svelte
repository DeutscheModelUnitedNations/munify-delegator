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
	class="group cursor-pointer bg-base-200/60 hover:bg-primary/10 border-base-300 hover:border-primary/40 focus-visible:outline-primary rounded-box flex min-w-0 items-center gap-3 border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
	disabled={disabled || busy}
	onclick={handleClick}
>
	<span
		class="bg-primary/10 text-primary group-hover:bg-primary/20 rounded-field flex size-8 shrink-0 items-center justify-center transition-colors"
	>
		{#if busy}
			<span class="loading loading-spinner loading-xs"></span>
		{:else}
			<i class="{icon} text-base"></i>
		{/if}
	</span>
	<span class="min-w-0 flex-1 truncate">{title}</span>
	<i
		class="fa-sharp-duotone fa-solid fa-arrow-down-to-line text-base-content/30 group-hover:text-primary shrink-0 text-xs transition-colors"
	></i>
</button>
