<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let query = $derived(data.BaseAssignmentDataQuery);
	let delegations = $derived($query.data?.findManyDelegations);
</script>

{#if $query.fetching}
	<Spinner />
{:else}
	{#each delegations! as delegation}
		{JSON.stringify(delegation)}
	{/each}
{/if}
