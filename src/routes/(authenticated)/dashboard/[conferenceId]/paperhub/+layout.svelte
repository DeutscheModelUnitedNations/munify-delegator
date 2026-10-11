<script lang="ts">
	import type { LayoutProps } from './$types';
	import TeamShell from '../team/TeamShell.svelte';

	let { children, params }: LayoutProps = $props();

	// A fresh `params` arrives with every navigation; the string keeps the shell from asking again.
	const conferenceId = $derived(params.conferenceId);
</script>

<TeamShell {conferenceId}>
	{@render children()}
</TeamShell>
