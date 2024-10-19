<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setHeaderStatus({
		label: m.participants(),
		faIcon: 'fa-person'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.participants()}</title>
</svelte:head>

<slot />
