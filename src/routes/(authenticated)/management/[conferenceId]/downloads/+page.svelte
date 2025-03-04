<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$houdini';
	import AllNations from './AllNations.svelte';
	import BadgeData from './BadgeData.svelte';
	import ConferenceRegistrationList from './ConferenceRegistrationList.svelte';

	let { data }: { data: PageData } = $props();
	let queryData = $derived(data.DownloadsBaseDataQuery);
	let conferenceData = $derived($queryData.data?.findUniqueConference);

	let loading = $state(false);
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.downloads()}</h2>
	</div>
	<BadgeData
		committees={conferenceData?.committees ?? []}
		bind:loading
		conferenceId={data.conferenceId}
	/>
	<ConferenceRegistrationList bind:loading conferenceId={data.conferenceId} />
	<AllNations bind:loading conferenceId={data.conferenceId} />
</div>
