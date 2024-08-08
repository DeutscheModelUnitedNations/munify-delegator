<script lang="ts">
	import ManagementSidebarWrapper from '$lib/components/ManagementSidebarWrapper.svelte';

	let { children } = $props();
</script>

<!-- TODO -->
<ManagementSidebarWrapper conferenceId="1">
	{@render children()}
</ManagementSidebarWrapper>
