<!--
	@component
	What an announcement's card says about it at a glance, in words: new to the reader, how
	important it is, and whether it is pinned.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { AnnouncementImportance } from '#lib/helpers/announcements';

	interface Props {
		importance: AnnouncementImportance;
		pinned: boolean;
		unread: boolean;
	}

	let { importance, pinned, unread }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-1.5">
	{#if unread}
		<span class="badge badge-primary badge-sm">{m.announcementNew()}</span>
	{/if}
	{#if importance === 'URGENT'}
		<span class="badge badge-error badge-sm">{m.announcementImportanceUrgent()}</span>
	{:else if importance === 'IMPORTANT'}
		<span class="badge badge-warning badge-sm">{m.announcementImportanceImportant()}</span>
	{/if}
	{#if pinned}
		<span class="badge badge-ghost badge-sm gap-1">
			<i aria-hidden="true" class="ph-fill ph-push-pin"></i>
			{m.announcementPinned()}
		</span>
	{/if}
</div>
