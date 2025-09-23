<script lang="ts">
	import { getProject } from './appData.svelte';

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

<slot />
