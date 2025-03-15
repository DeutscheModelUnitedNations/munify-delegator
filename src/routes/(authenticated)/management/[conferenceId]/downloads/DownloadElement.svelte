<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	interface Props {
		title: string;
		btnClick: () => void;
		loading: boolean;
	}

	let { title, btnClick, loading = $bindable() }: Props = $props();
</script>

<h3 class="text-lg">{title}</h3>

<button class="btn btn-primary btn-sm" onclick={btnClick}>
	{#if loading}
		<i class="fas fa-spinner fa-spin"></i>
	{:else}
		<i class="fas fa-download"></i>
	{/if}
</button>
