<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import AnnouncementFeed from '#lib/components/announcement/AnnouncementFeed.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);
</script>

<svelte:head>
	<title>{m.announcementSectionTitle()}</title>
</svelte:head>

<div class="flex w-full flex-col gap-6">
	<BackToDashboard {conferenceId} />
	<p class="text-base-content/70">{m.announcementPageDescription()}</p>
	<AnnouncementFeed {conferenceId} showEmpty />
</div>
