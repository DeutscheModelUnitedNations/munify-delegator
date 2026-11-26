<!--
	@component
	What a chat in the list carries beside its latest message: that the caller muted it, that its
	inbox put it into the archive, and the badge `listBadge` gives it (reported, or its inbox).
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import { inboxName, listBadge } from './chatLabels';

	interface Props {
		chat: ChatSummary;
		/** Names the inbox on a team chat, for a list not narrowed to one inbox */
		showInbox: boolean;
	}

	let { chat, showInbox }: Props = $props();

	const badge = $derived(listBadge({ chat, showInbox }));
</script>

{#if chat.muted}
	<span class="text-base-content/50 shrink-0" title={m.chatMutedHint()}>
		<i aria-hidden="true" class="ph-duotone ph-bell-slash"></i>
		<span class="sr-only">{m.chatMuted()}</span>
	</span>
{/if}
{#if chat.archived}
	<span class="badge badge-ghost badge-sm shrink-0 gap-1">
		<i aria-hidden="true" class="ph-duotone ph-archive"></i>
		{m.chatArchived()}
	</span>
{/if}
{#if badge === 'reported'}
	<span class="badge badge-warning badge-sm shrink-0">{m.chatReported()}</span>
{:else if badge}
	<span class="badge badge-ghost badge-sm shrink-0">
		{badge.own
			? m.chatInboxTrustedOwn()
			: inboxName({
					inbox: badge.inbox,
					committeeAbbreviation: chat.committee?.abbreviation,
					roleName: chat.role?.name
				})}
	</span>
{/if}
