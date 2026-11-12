<script lang="ts">
	import { fetchChats } from '#lib/api/chats';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import { m } from '#lib/paraglide/messages';

	/**
	 * The messages entry of the team menu, pinging while an inbox the caller answers holds
	 * something unread or a reported chat waits for participant care. Live.
	 */
	interface Props {
		conferenceId: string;
		active?: boolean;
	}

	let { conferenceId, active }: Props = $props();

	const chats = $derived(await fetchChats({ conferenceId }));
	const unread = $derived(
		chats
			.filter((chat) => sideOf(chat) === 'TEAM')
			.reduce((total, chat) => total + chat.unreadCount, 0)
	);
	const reported = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW').length);
</script>

<NavMenuButton
	href="/dashboard/{conferenceId}/team/messages"
	icon="ph-chats-circle"
	{active}
	title={m.chatMessages()}
	attention={unread > 0 || reported > 0}
	attentionLabel={reported > 0
		? m.chatReportsWaiting({ count: reported })
		: m.chatUnreadCount({ count: unread })}
/>
