<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { setAuthHeader } from '$lib/services/authenticatedHeaderStatus.svelte';

	setAuthHeader({
		label: m.admininstration(),
		faIcon: 'fa-bars-progress'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.admininstration()}</title>
</svelte:head>

	<slot />
