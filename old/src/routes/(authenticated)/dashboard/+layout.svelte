<script lang="ts">
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>MUNify Delegator - {m.dashboard()}</title>
</svelte:head>

<!-- TODO calculate actives/non expired ones -->
<DelegateSidebarWrapper conferences={data.myConferences}>
	{@render children()}
</DelegateSidebarWrapper>
