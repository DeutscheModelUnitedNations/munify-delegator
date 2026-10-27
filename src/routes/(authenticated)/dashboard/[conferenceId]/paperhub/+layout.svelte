<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import type { LayoutProps } from './$types';
	import TeamShell from '../team/TeamShell.svelte';

	let { children, params }: LayoutProps = $props();

	// A fresh `params` arrives with every navigation; the string keeps the shell from asking again.
	const conferenceId = $derived(params.conferenceId);
</script>

<TeamShell {conferenceId}>
	<div class="pt-4">
		<BackToDashboard {conferenceId} />
	</div>
	{@render children()}
</TeamShell>
