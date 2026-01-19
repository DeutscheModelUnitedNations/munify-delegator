<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		fetching?: boolean;
		error?: boolean;
		children?: Snippet;
	}

	let { fetching = true, error = false, children }: Props = $props();
</script>

{#if fetching}
	<i class="fa-duotone fa-spinner fa-spin"></i>
{:else if error}
	<i class="fas fa-triangle-exclamation text-error"></i>
{:else}
	{@render children?.()}
{/if}
