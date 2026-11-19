<!--
	@component
	The messages entries of the team menu: "Messages", with a dot while something is unread, and for
	participant care "Reports" beside it, with a dot while a reported chat waits. The page narrows
	its list to one inbox itself. Live.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { fetchChats } from '#lib/api/chats';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { fetchTeamInboxes, teamInboxesOf } from './messages/fetchTeamInboxes';

	interface Props {
		conferenceId: string;
		active?: boolean;
	}

	let { conferenceId, active = false }: Props = $props();

	const me = await getCurrentUser();
	const [chats, sources] = $derived(
		await Promise.all([
			fetchChats({ conferenceId }),
			fetchTeamInboxes({ conferenceId, userId: me.sub })
		])
	);
	const cares = $derived(teamInboxesOf(sources).cares);
	const unread = $derived(
		chats.reduce((total, chat) => total + (sideOf(chat) === 'TEAM' ? chat.unreadCount : 0), 0)
	);
	const reported = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW').length);
	const onReports = $derived(active && page.url.searchParams.get('view') === 'reports');
</script>

<NavMenuButton
	href={resolve(`dashboard/${conferenceId}/team/messages`)}
	icon="ph-chats-circle"
	active={active && !onReports}
	title={m.chatMessages()}
	attention={unread > 0}
	attentionLabel={m.chatUnreadCount({ count: unread })}
/>
{#if cares}
	<NavMenuButton
		href={resolve(`dashboard/${conferenceId}/team/messages?view=reports`)}
		icon="ph-flag"
		active={onReports}
		title={m.chatReports()}
		attention={reported > 0}
		attentionLabel={m.chatReportsWaiting({ count: reported })}
	/>
{/if}
