<!--
	@component
	The inboxes a team member answers, as chips that narrow the chat list to one of them, each with
	how much of it is unread.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import FilterChips from '#lib/components/chat/FilterChips.svelte';
	import { inboxName } from '#lib/components/chat/chatLabels';
	import type { TeamInbox } from './teamInboxes';

	interface Props {
		inboxes: readonly TeamInbox[];
		/** The key of the inbox the list is narrowed to; null for all */
		selected: string | null;
		unreadOf: (key: string) => number;
		onSelect: (key: string | null) => void;
	}

	let { inboxes, selected, unreadOf, onSelect }: Props = $props();
</script>

<FilterChips options={inboxes} {selected} {onSelect} label={m.chatInboxes()}>
	{#snippet chip(inbox)}
		{@const unread = unreadOf(inbox.key)}
		{inbox.own ? m.chatInboxTrustedOwn() : inboxName(inbox)}
		{#if unread > 0}<span class="badge badge-xs badge-primary">{unread}</span>{/if}
	{/snippet}
</FilterChips>
