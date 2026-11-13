<!--
	@component
	The caller's announcements of a conference. On the dashboard (`limit`) it shows what is pinned
	or unread and the newest, with a link to the rest; on the announcements page all of them. Shows
	nothing at all without announcements unless `showEmpty`.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { fetchAnnouncementFeed, markAnnouncementsRead } from '#lib/api/announcements';
	import { dashboardFeed } from '#lib/helpers/announcements';
	import { isAnnouncementRead } from '#lib/state/announcementReads.svelte.js';
	import AnnouncementCard from './AnnouncementCard.svelte';

	interface Props {
		conferenceId: string;
		/** How many the dashboard shows at most, besides the pinned and the unread; all without. */
		limit?: number;
		showEmpty?: boolean;
	}

	let { conferenceId, limit, showEmpty = false }: Props = $props();

	const feed = $derived(await fetchAnnouncementFeed(conferenceId));
	// one read of the live result, each item with whether it is read, here or in the API
	const items = $derived(
		feed.slice().map((item) => ({ item, pinned: item.pinned, read: isAnnouncementRead(item) }))
	);
	const shown = $derived(limit === undefined ? items : dashboardFeed({ feed: items, limit }));
	const unread = $derived(items.filter((entry) => !entry.read).map((entry) => entry.item.id));

	const markRead = (ids: string[]) => markAnnouncementsRead({ conferenceId, ids });
</script>

{#if items.length > 0}
	<section
		class="flex flex-col gap-3"
		aria-labelledby="announcement-feed-title"
		data-testid="announcement-feed"
	>
		<div class="flex flex-wrap items-center gap-3">
			<h2 id="announcement-feed-title" class="text-xl font-bold">
				{m.announcementSectionTitle()}
			</h2>
			{#if unread.length > 0}
				<span class="badge badge-primary" data-testid="announcement-unread-count">
					{m.announcementUnreadCount({ count: unread.length })}
				</span>
			{/if}
			<span class="flex-1"></span>
			{#if unread.length > 1}
				<button class="btn btn-ghost btn-sm" onclick={() => markRead(unread)}>
					<i aria-hidden="true" class="ph-duotone ph-checks"></i>
					{m.announcementMarkAllRead()}
				</button>
			{/if}
		</div>
		{#each shown as { item, read } (item.id)}
			<AnnouncementCard
				id="announcement-{item.id}"
				title={item.title}
				body={item.body}
				importance={item.importance}
				pinned={item.pinned}
				signature={item.signature}
				publishAt={item.publishAt}
				editedAt={item.editedAt}
				{read}
				attachments={item.attachments}
				expanded={limit === undefined}
				onread={() => markRead([item.id])}
			/>
		{/each}
		{#if limit !== undefined && items.length > shown.length}
			<a
				class="btn btn-ghost btn-sm self-start"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/announcements', { conferenceId })}
			>
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				{m.announcementShowAll({ count: items.length })}
			</a>
		{/if}
	</section>
{:else if showEmpty}
	<div class="alert" data-testid="announcement-feed-empty">
		<i aria-hidden="true" class="ph-duotone ph-megaphone"></i>
		<span>{m.announcementFeedEmpty()}</span>
	</div>
{/if}
