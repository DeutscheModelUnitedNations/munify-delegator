<script lang="ts">
	import { setAuthHeader } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setAuthHeader({
		label: m.settings(),
		faIcon: 'fa-cog'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.settings()}</title>
</svelte:head>

<slot />