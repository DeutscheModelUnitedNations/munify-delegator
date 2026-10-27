<script lang="ts">
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import type { LayoutProps } from './$types';
	import TeamShell from '../team/TeamShell.svelte';

	let { children, params }: LayoutProps = $props();

	// A fresh `params` arrives with every navigation; the string keeps the shell from asking again.
	const conferenceId = $derived(params.conferenceId);
</script>

<!-- Participants get no menu, so the page brings its own way back -->
<TeamShell {conferenceId}>
	{#snippet withoutMenu()}
		<div class="pt-4">
			<BackToDashboard {conferenceId} />
		</div>
	{/snippet}
	{@render children()}
</TeamShell>
