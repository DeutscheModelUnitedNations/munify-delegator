<script lang="ts">
	import type { LayoutProps } from './$types';
	import ManagementShell from '../management/ManagementShell.svelte';

	let { children, params }: LayoutProps = $props();

	// A fresh `params` arrives with every navigation; the string keeps the shell from asking again.
	const conferenceId = $derived(params.conferenceId);
</script>

<ManagementShell {conferenceId}>
	{@render children()}
</ManagementShell>
