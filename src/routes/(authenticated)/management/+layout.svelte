<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';

	setHeaderStatus({
		label: m.admininstration(),
		faIcon: 'fa-bars-progress'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.admininstration()}</title>
</svelte:head>

<slot />
