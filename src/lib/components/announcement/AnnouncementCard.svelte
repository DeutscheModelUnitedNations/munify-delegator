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
	import AnnouncementActions from './AnnouncementActions.svelte';
	import AnnouncementBadges from './AnnouncementBadges.svelte';
	import AnnouncementAttachments from './AnnouncementAttachments.svelte';

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
			<AnnouncementBadges {importance} {pinned} unread={read === false} />
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

		{#if !folded}
			<AnnouncementAttachments {attachments} />
		{/if}

		<AnnouncementActions {foldable} {opened} unread={read === false} ontoggle={toggle} {onread} />
	</div>
</article>
