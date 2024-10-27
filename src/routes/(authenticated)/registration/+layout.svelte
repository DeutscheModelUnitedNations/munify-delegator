<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setHeaderStatus({
		label: m.signup(),
		faIcon: 'fa-arrow-right-to-bracket'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.signup()}</title>
</svelte:head>

{@render children()}