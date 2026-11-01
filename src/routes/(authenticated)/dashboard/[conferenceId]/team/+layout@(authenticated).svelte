<script lang="ts">
	import type { LayoutProps } from './$types';
	import TeamShell from './TeamShell.svelte';

	let { children, params }: LayoutProps = $props();

	// Every navigation hands the layout a fresh `params`, one that only changes the query included;
	// a string that has not changed keeps the shell from asking for the membership again each time.
	const conferenceId = $derived(params.conferenceId);
</script>

<TeamShell {conferenceId}>
	{@render children()}
</TeamShell>
