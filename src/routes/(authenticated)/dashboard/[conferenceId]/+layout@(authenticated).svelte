<script lang="ts">
	import { dev } from '$app/env';
	import { m } from '#lib/paraglide/messages';
	import type { LayoutProps } from './$types';
	import ConferenceShell from './ConferenceShell.svelte';

	let { children, params }: LayoutProps = $props();

	// Every navigation hands the layout a fresh `params`, one that only changes the query included;
	// a string that has not changed keeps the shell from asking for the membership again each time.
	const conferenceId = $derived(params.conferenceId);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.overview()}</title>
</svelte:head>

<ConferenceShell {conferenceId}>
	{@render children()}
</ConferenceShell>
