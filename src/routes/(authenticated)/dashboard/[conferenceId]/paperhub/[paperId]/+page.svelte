<script lang="ts">
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import PaperEditor from '$lib/components/Paper/Editor';
	import { editorContentStore } from '$lib/components/Paper/Editor/editorStore';
	import { onMount } from 'svelte';
	import {
		compareEditorContentHash,
		hashEditorContent
	} from '$lib/components/Paper/Editor/contentHash';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.getPaperDetailsForEditingQuery);
	let paperData = $derived($paperQuery?.data.findUniquePaper);

	let initialized = $state(false);

	addToPanel('paperData', () => paperData);

	onMount(() => {
		$editorContentStore = paperData.versions[0].content;
		initialized = true;
	});
</script>

<div class="flex flex-col gap-2 w-full">
	<h2 class="text-2xl font-bold">Test</h2>
	{#if initialized}
		{#if paperData.type === 'WORKING_PAPER'}
			<PaperEditor.ResolutionFormat />
		{:else}
			<PaperEditor.PaperFormat />
		{/if}
	{/if}
</div>
