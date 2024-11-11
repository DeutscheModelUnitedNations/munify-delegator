<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setHeaderStatus({
		label: m.delegations(),
		faIcon: 'fa-flag-swallowtail'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.delegations()}</title>
</svelte:head>

{@render children()}
