<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

</script>

<svelte:head>
	<title>MUNify Delegator - {m.admininstration()}</title>
</svelte:head>

{@render children()}
