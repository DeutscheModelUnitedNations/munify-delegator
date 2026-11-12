<!--
	@component
	The header's note that chats of the conference on screen hold something unread: a chat icon
	with the count, leading to the participant's messages or, for a team inbox, the team's. Shows
	nothing while everything is read, so it only appears when there is a reason to look.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { fetchChats } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import { sideOf, unreadChats } from './chatLabels';

	let { conferenceId }: { conferenceId: string } = $props();

	const chats = $derived(await fetchChats({ conferenceId }));
	const { unread, total } = $derived(unreadChats(chats));
	// a team member's unread chats are their inboxes'
	const forTeam = $derived(unread.some((chat) => sideOf(chat) === 'TEAM'));
</script>

{#if total > 0}
	<a
		href={resolve(`dashboard/${conferenceId}/${forTeam ? 'team/messages' : 'messages'}`)}
		class="btn btn-ghost btn-circle btn-sm relative"
		aria-label={`${m.chatMessages()}: ${m.chatUnreadCount({ count: total })}`}
		title={m.chatUnreadCount({ count: total })}
		data-testid="header-unread-messages"
	>
		<i aria-hidden="true" class="ph-duotone ph-chats-circle text-lg"></i>
		<span
			class="badge badge-primary badge-xs absolute -top-0.5 -right-1 px-1 leading-none"
			aria-hidden="true"
		>
			{total > 99 ? '99+' : total}
		</span>
	</a>
{/if}
