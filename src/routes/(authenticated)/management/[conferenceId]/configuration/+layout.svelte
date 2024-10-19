<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setHeaderStatus({
		label: m.settings(),
		faIcon: 'fa-cog'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.settings()}</title>
</svelte:head>

<slot />
