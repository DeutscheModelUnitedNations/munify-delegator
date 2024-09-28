<script lang="ts">
	import ManagementSidebarWrapper from '$lib/components/ManagementSidebarWrapper.svelte';

	let { children, data } = $props();
</script>

<!-- TODO -->
<ManagementSidebarWrapper conferenceId={data.conferenceData.id}>
	{@render children()}
</ManagementSidebarWrapper>
