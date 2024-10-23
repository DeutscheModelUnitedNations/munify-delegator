<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	setHeaderStatus({
		label: m.myAccount(),
		faIcon: 'fa-user'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.myAccount()}</title>
</svelte:head>

{@render children()}