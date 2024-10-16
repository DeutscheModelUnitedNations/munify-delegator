<script lang="ts">
	import ManagementSidebarWrapper from '$lib/components/ManagementSidebarWrapper.svelte';
	import { onMount } from 'svelte';
	import { getTableSettings } from '$lib/components/DataTable/tableSettings.svelte';

	let { children, data } = $props();

	const { setTableSize, setZebra } = getTableSettings();

	onMount(() => {
		if (localStorage.getItem('tableSize'))
			setTableSize(localStorage.getItem('tableSize') as 'xs' | 'sm' | 'md' | 'lg');
		if (localStorage.getItem('tableZebra')) setZebra(localStorage.getItem('tableZebra') === 'true');
	});
</script>

<ManagementSidebarWrapper conferenceId={data.conferenceData.id}>
	{@render children()}
</ManagementSidebarWrapper>
