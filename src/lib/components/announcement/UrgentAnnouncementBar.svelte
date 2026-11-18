<!--
	@component
	The bar across the pages of a conference while the caller has an urgent announcement they have
	not read: its title, a link to it and a way to dismiss it, which marks it read.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { fetchAnnouncementFeed, markAnnouncementsRead } from '#lib/api/announcements';
	import { urgentUnread } from '#lib/helpers/announcements';
	import { isAnnouncementRead } from '#lib/state/announcementReads.svelte.js';

	let { conferenceId }: { conferenceId: string } = $props();

	const feed = $derived(await fetchAnnouncementFeed(conferenceId));
	const urgent = $derived(
		urgentUnread(
			feed.slice().map((item) => ({
				id: item.id,
				title: item.title,
				importance: item.importance,
				publishAt: item.publishAt,
				read: isAnnouncementRead(item)
			}))
		)
	);
</script>

{#if urgent}
	<div
		class="bg-error text-error-content flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 md:px-8"
		role="status"
		data-testid="urgent-announcement-bar"
	>
		<i aria-hidden="true" class="ph-fill ph-siren text-lg"></i>
		<span class="min-w-0 flex-1 font-semibold break-words">
			<span class="sr-only">{m.announcementImportanceUrgent()}: </span>{urgent.title}
		</span>
		<a
			class="btn btn-sm"
			href="{resolve('/(authenticated)/dashboard/[conferenceId]/announcements', {
				conferenceId
			})}#announcement-{urgent.id}"
		>
			{m.announcementRead()}
		</a>
		<button
			class="btn btn-ghost btn-sm btn-circle"
			aria-label={m.announcementDismiss()}
			title={m.announcementDismiss()}
			onclick={() => markAnnouncementsRead({ conferenceId, ids: [urgent.id] })}
		>
			<i aria-hidden="true" class="ph-duotone ph-x"></i>
		</button>
	</div>
{/if}
