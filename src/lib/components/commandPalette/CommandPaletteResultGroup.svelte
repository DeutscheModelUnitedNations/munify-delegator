<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		icon: string;
		loading?: boolean;
		children: Snippet;
	}

	let { title, icon, loading = false, children }: Props = $props();
</script>

<div class="px-2 py-1">
	<div class="flex items-center gap-2 px-3 py-1.5">
		<i class="fa-duotone {icon} text-xs text-base-content/40"></i>
		<span class="text-xs font-semibold uppercase tracking-wider text-base-content/40">{title}</span>
		{#if loading}
			<span class="loading loading-spinner loading-xs text-base-content/40"></span>
		{/if}
	</div>
	{@render children()}
</div>
