<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setHeaderStatus({
		label: m.supervisors(),
		faIcon: 'fa-hands-holding-heart'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.supervisors()}</title>
</svelte:head>

{@render children()}
