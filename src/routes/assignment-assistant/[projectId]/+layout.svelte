<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { getProject } from './appData.svelte';
	import Tabs from '$lib/components/Tabs/Tabs.svelte';
	import Tab from '$lib/components/Tabs/Tab.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const downloadData = () => {
		const filename = `assignment-assistant-data_${new Date().toISOString()}.json`;
		const project = getProject();
		const blob = new Blob([JSON.stringify(project?.data)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<div class="navbar bg-base-200 gap-4 p-2">
	<a class="btn btn-ghost" href="/assignment-assistant" aria-label="Back">
		<i class="fas fa-arrow-left"></i>
	</a>
	<div class="flex flex-1 flex-col items-start">
		<h2 class="text-lg font-bold">Assignment Assistant</h2>
		<h3 class="text-sm">{getProject()?.fileName}</h3>
	</div>
	<button class="btn btn-primary" onclick={downloadData} aria-label="Download">
		<i class="fas fa-download"></i>
	</button>
</div>

<main class="hidden w-full flex-col p-10 lg:flex">
	<Tabs>
		<Tab active={data.tab === 'sighting'} title="Sichtung" icon="eye" href="sighting" />
		<Tab
			active={data.tab === 'weighting'}
			title="Gewichtung"
			icon="balance-scale"
			href="weighting"
		/>
		<Tab active={data.tab === 'singles'} title="Singles" icon="user-tie" href="singles" />
		<Tab active={data.tab === 'assignment'} title="Zuweisung" icon="split" href="assignment" />
		<Tab
			active={data.tab === 'summary'}
			title="Zusammenfassung"
			icon="clipboard-list"
			href="summary"
		/>
	</Tabs>

	{@render children?.()}
</main>

<main class="h-full w-full flex-col items-center justify-center p-10 lg:hidden">
	<i class="fa-duotone fa-ban text-5xl"></i>
	<h1 class="text-2xl font-bold">Smaller Screensizes are not supported</h1>
	<p class="text-base">Please use a larger screen to view this page</p>
</main>
