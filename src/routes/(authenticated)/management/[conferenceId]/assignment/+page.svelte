<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let query = $derived(data.BaseAssignmentDataQuery);
	let delegations = $derived($query.data?.findManyDelegations);
	let conference = $derived($query.data?.findUniqueConference);
</script>

{#if $query.fetching}
	<Spinner />
{:else}
	{JSON.stringify(delegations)}
  {JSON.stringify(conference)}
{/if}
