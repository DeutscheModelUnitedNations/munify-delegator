<script lang="ts">
	import type { PageData } from './$houdini';
	import { m } from '$lib/paraglide/messages';
	import Markdown from '$lib/components/Markdown/Markdown.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceData = $derived(data.ConferenceInfoQuery);
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-2">
		<a class="btn btn-square btn-ghost" aria-label="back" href="./">
			<i class="fas fa-arrow-left"></i>
		</a>
		<h1 class="text-2xl font-bold">{m.conferenceInfo()}</h1>
	</div>
	<div class="prose bg-base-200 w-full rounded-2xl p-4">
		<Markdown source={$conferenceData.data?.findUniqueConference?.info ?? ''} />
	</div>
</div>
