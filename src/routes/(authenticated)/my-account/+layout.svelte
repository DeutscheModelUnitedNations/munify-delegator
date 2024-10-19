<script lang="ts">
	import { setAuthHeader } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setAuthHeader({
		label: m.myAccount(),
		faIcon: 'fa-user'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.myAccount()}</title>
</svelte:head>

<slot />