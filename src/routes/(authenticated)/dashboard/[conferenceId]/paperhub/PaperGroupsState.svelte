<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoadState from '$lib/components/LoadState.svelte';
	import { m } from '$lib/paraglide/messages';

	/** The paper groups once loaded, or a spinner, the error, or the note that there are none. */
	interface Props {
		loading: boolean;
		error: string | undefined;
		empty: boolean;
		children: Snippet;
	}

	let { loading, error, empty, children }: Props = $props();
</script>

<LoadState {loading} {error}>
	{#if empty}
		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
			<span>{m.noPapersSubmittedYet()}</span>
		</div>
	{:else}
		{@render children()}
	{/if}
</LoadState>
