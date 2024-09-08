<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';
	let { data, children } = $props();

	if (browser && (data.conferences == undefined || data.conferences?.length == 0)) {
		goto('./no-conference');
	}
</script>

<!-- TODO calculate actives -->
<DelegateSidebarWrapper conferences={data.conferences}>
	{@render children()}
</DelegateSidebarWrapper>
