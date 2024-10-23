<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setHeaderStatus({
		label: m.statistics(),
		faIcon: 'fa-chart-simple'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.statistics()}</title>
</svelte:head>

{@render children()}
