<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setHeaderStatus({
		label: m.myAccount(),
		faIcon: 'fa-user'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.myAccount()}</title>
</svelte:head>

<slot />
