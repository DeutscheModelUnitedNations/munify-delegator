<script lang="ts">
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';
	let { data, children } = $props();
</script>

<!-- TODO calculate actives -->
<DelegateSidebarWrapper activeConferences={data.conferences} pastConferences={data.conferences}>
	{@render children()}
</DelegateSidebarWrapper>
