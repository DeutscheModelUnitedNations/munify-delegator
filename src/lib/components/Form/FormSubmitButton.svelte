<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Spinner from '../Spinner.svelte';

	let { disabled, loading }: { disabled: boolean; loading: boolean } = $props();
</script>

<button disabled={disabled || loading} class="btn btn-primary mt-10 w-full"
	>{m.save()}

	{#if loading}
		<Spinner />
	{/if}
</button>
