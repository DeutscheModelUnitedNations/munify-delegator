<script lang="ts">
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';

	let { data, children } = $props();
</script>

<!-- <DelegateSidebarWrapper
	activeConferences={data.conferences.filter((x) => x.active)}
	pastConferences={data.conferences.filter((x) => !x.active)}
> -->
	{@render children()}
<!-- </DelegateSidebarWrapper> -->
