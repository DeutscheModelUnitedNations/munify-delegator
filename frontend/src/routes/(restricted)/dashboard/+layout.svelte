<script lang="ts">
	import DelegateSidebarWrapper from '$lib/components/DelegateSidebarWrapper.svelte';

	const testConferences = [
		{ id: '1', name: 'MUN-SH 2025', active: true },
		{ id: '2', name: 'MUNBW 2025', active: true },
		{ id: '3', name: 'MUN-SH 2024', active: false },
		{ id: '4', name: 'MUN-SH 2023', active: false },
		{ id: '5', name: 'MUNBW 2023', active: false }
	];

</script>
<DelegateSidebarWrapper
	activeConferences={testConferences.filter((x) => x.active)}
	pastConferences={testConferences.filter((x) => !x.active)}
>
<slot />
</DelegateSidebarWrapper>