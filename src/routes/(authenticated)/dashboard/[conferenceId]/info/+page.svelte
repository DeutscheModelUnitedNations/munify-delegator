<script lang="ts">
	import SvelteMarkdown from 'svelte-markdown';
	import type { PageData } from './$houdini';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();
	let conferenceData = $derived(data.conferenceInfoQuery);
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-2">
		<a class="btn btn-square btn-ghost" aria-label="back" href="./">
			<i class="fas fa-arrow-left"></i>
		</a>
		<h1 class="text-2xl font-bold">{m.conferenceInfo()}</h1>
	</div>
	<div class="prose w-full rounded-2xl bg-base-200 p-4">
		<SvelteMarkdown source={$conferenceData.data?.findUniqueConference?.info ?? ''} />
	</div>
</div>
