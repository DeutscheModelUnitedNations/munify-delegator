<!--
	@component
	One announcement as its readers see it: on the dashboard, on the announcements page and as the
	editor's preview. Its colour and label follow its importance; a long text is folded until the
	reader opens it, which counts as reading it.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import Markdown from '#lib/components/markdown/Markdown.svelte';
	import type { AnnouncementImportance } from '#lib/helpers/announcements';

	interface Props {
		/** Anchors the card, so a link can lead to it. */
		id?: string;
		title: string;
		body: string;
		importance: AnnouncementImportance;
		pinned?: boolean;
		signature?: string | null;
		publishAt?: Date | string | null;
		editedAt?: Date | string | null;
		/** Left out for a preview, which has no reader. */
		read?: boolean;
		attachments?: { id: string; fileName?: string | null; url: string }[];
		/** Shows the whole text whatever its length. */
		expanded?: boolean;
		onread?: () => void;
	}

	let {
		id,
		title,
		body,
		importance,
		pinned = false,
		signature,
		publishAt,
		editedAt,
		read,
		attachments = [],
		expanded = false,
		onread
	}: Props = $props();

	const FOLD_AT = 400;
	const foldable = $derived(!expanded && importance !== 'URGENT' && body.length > FOLD_AT);
	let opened = $state(false);
	const folded = $derived(foldable && !opened);

	const LOOK = {
		NORMAL: { edge: 'bg-info', box: 'border-info/25 from-info/10', icon: 'ph-megaphone' },
		IMPORTANT: {
			edge: 'bg-warning',
			box: 'border-warning/40 from-warning/15',
			icon: 'ph-warning-circle'
		},
		URGENT: { edge: 'bg-error', box: 'border-error/50 from-error/15', icon: 'ph-siren' }
	} as const;
	const look = $derived(LOOK[importance]);

	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });

	function toggle() {
		opened = !opened;
		if (opened && read === false) onread?.();
	}
</script>

<article
	{id}
	class="rounded-box relative scroll-mt-24 overflow-hidden border bg-gradient-to-br to-transparent shadow-sm {look.box}"
	data-testid="announcement-card"
	data-unread={read === false ? 'true' : undefined}
>
	<div class="absolute inset-y-0 left-0 w-1.5 {look.edge}" aria-hidden="true"></div>
	<div class="flex flex-col gap-3 p-4 pl-6 sm:p-5 sm:pl-7">
		<header class="flex flex-wrap items-start gap-x-3 gap-y-1">
			<i aria-hidden="true" class="ph-duotone {look.icon} mt-0.5 text-xl"></i>
			<div class="min-w-0 flex-1">
				<h3 class="text-lg leading-tight font-bold break-words">{title}</h3>
				<p class="text-base-content/70 flex flex-wrap gap-x-2 text-xs">
					{#if publishAt}
						<time datetime={new Date(publishAt).toISOString()}>{dateTime(publishAt)}</time>
					{/if}
					{#if editedAt}
						<span>{m.announcementEditedAt({ date: dateTime(editedAt) })}</span>
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-1.5">
				{#if read === false}
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
		</header>

		<div class={folded ? 'relative max-h-28 overflow-hidden' : ''}>
			<div class="prose prose-sm max-w-none text-base break-words">
				<Markdown source={body} />
			</div>
			{#if folded}
				<div
					class="from-base-100 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent"
					aria-hidden="true"
				></div>
			{/if}
		</div>

		{#if signature && !folded}
			<p class="text-base-content/80 text-sm italic">{signature}</p>
		{/if}

		{#if attachments.length > 0 && !folded}
			<ul class="flex flex-wrap gap-2" aria-label={m.announcementAttachments()}>
				{#each attachments as attachment (attachment.id)}
					<li>
						<!-- eslint-disable svelte/no-navigation-without-resolve -- a file in the bucket, not a route -->
						<a
							class="btn btn-sm btn-outline"
							href={attachment.url}
							target="_blank"
							rel="noopener noreferrer"
						>
							<i aria-hidden="true" class="ph-duotone ph-paperclip"></i>
							{attachment.fileName ?? m.announcementAttachment()}
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</li>
				{/each}
			</ul>
		{/if}

		{#if foldable || (read === false && onread)}
			<div class="flex flex-wrap gap-2">
				{#if foldable}
					<button class="btn btn-ghost btn-sm" aria-expanded={opened} onclick={toggle}>
						<i aria-hidden="true" class="ph-duotone {opened ? 'ph-caret-up' : 'ph-caret-down'}"></i>
						{opened ? m.showLess() : m.showMore()}
					</button>
				{/if}
				{#if read === false && onread}
					<button class="btn btn-ghost btn-sm" onclick={() => onread()}>
						<i aria-hidden="true" class="ph-duotone ph-check"></i>
						{m.announcementMarkRead()}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</article>
