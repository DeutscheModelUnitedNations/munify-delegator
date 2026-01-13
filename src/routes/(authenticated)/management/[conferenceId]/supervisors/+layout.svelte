<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { dev } from '$app/environment';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.supervisors()}</title>
</svelte:head>

{@render children()}
