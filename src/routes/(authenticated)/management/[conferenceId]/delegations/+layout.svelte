<script lang="ts">
	import { setHeaderStatus } from '$lib/services/authenticatedHeaderStatus.svelte';
	import * as m from '$lib/paraglide/messages.js';

	setHeaderStatus({
		label: m.delegations(),
		faIcon: 'fa-flag-swallowtail'
	});
</script>

<svelte:head>
	<title>MUNify Delegator - {m.delegations()}</title>
</svelte:head>

<slot />
