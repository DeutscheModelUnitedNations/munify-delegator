<script lang="ts">
	interface Props {
		title: string;
		icon?: string;
		loading?: boolean;
		disabled?: boolean;
		onclick: () => void;
	}

	let {
		title,
		icon = 'fas fa-file-csv',
		loading = false,
		disabled = false,
		onclick
	}: Props = $props();
</script>

<button
	class="btn btn-outline btn-sm gap-2 justify-start h-auto py-2 min-h-0"
	{disabled}
	onclick={() => onclick()}
>
	{#if loading}
		<span class="loading loading-spinner loading-xs"></span>
	{:else}
		<i class="{icon} text-sm opacity-70"></i>
	{/if}
	<span class="truncate text-left">{title}</span>
</button>
