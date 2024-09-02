<script lang="ts">
	import { goto } from '$app/navigation';
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';
	let { data, children } = $props();

	if (data.conferences == undefined || data.conferences?.length == 0) {
		goto('./no-conference');
	}
</script>

<DelegateSidebarWrapper conferences={data.conferences}>
	{@render children()}
</DelegateSidebarWrapper>
