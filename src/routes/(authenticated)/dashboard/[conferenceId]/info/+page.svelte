<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import Markdown from '#lib/components/markdown/Markdown.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: params.conferenceId },
			id: true,
			title: true,
			info: true
		})
	);
</script>

<!--
	@deprecated LEGACY PAGE - No links lead to this page anymore.
	Conference info/announcements are now displayed directly on the dashboard
	via the AnnouncementContent component. This page is kept for backwards
	compatibility with any bookmarked URLs but may be removed in the future.
-->

<div class="flex w-full flex-col gap-4">
	<div class="flex items-center gap-2">
		<a
			class="btn btn-square btn-ghost"
			aria-label={m.back()}
			href={resolve(`dashboard/${params.conferenceId}`)}><i class="fas fa-arrow-left"></i></a
		>

		<h1 class="text-2xl font-bold">{m.conferenceInfo()}</h1>
	</div>
	<div class="prose bg-base-200 w-full rounded-box p-4">
		<Markdown source={conference?.info ?? ''} />
	</div>
</div>
