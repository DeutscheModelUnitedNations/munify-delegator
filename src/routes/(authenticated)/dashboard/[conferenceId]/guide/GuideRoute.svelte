<script lang="ts">
	import { dev } from '$app/env';
	import { resolve } from '$app/paths';
	import { queryParameters } from 'sveltekit-search-params';
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import GuideReader from '#lib/components/guide/GuideReader.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	/**
	 * The conference's preparation guide, as the caller reads it (`myGuide`): its first page, or
	 * `pageId`.
	 */
	let { conferenceId, pageId }: { conferenceId: string; pageId?: string } = $props();

	const search = queryParameters({ entry: true });

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, title: true })
	);

	const hrefOf = ({ pageId: id, key }: { pageId: string; key?: string }) =>
		resolve('/(authenticated)/dashboard/[conferenceId]/guide/[pageId]', {
			conferenceId,
			pageId: id
		}) + (key ? `?entry=${encodeURIComponent(key)}` : '');
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}{conference.title} – {m.guideTitle()}</title>
</svelte:head>

<div class="flex w-full flex-col gap-4 p-4 max-sm:px-2">
	<BackToDashboard {conferenceId} />
	<GuideReader {conferenceId} {pageId} entryKey={search.entry ?? null} {hrefOf} />
</div>
