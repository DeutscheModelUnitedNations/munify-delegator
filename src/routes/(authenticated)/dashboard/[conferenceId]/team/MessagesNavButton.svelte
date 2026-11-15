<!--
	@component
	The messages entry of the team menu. For somebody answering one inbox it is a plain entry; with
	several inboxes (or the reports of participant care) it folds open into them: the overview
	first, then every inbox with
	how much of it is unread, a committee holding several as a group of its own to fold. Pings while
	something is unread or a reported chat waits. Live.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { fetchChats } from '#lib/api/chats';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { fetchTeamInboxes, teamInboxesOf } from './messages/fetchTeamInboxes';
	import InboxNavEntries from './messages/InboxNavEntries.svelte';
	import { unreadByInbox } from './messages/teamInboxes';

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
	const team = $derived(teamInboxesOf(sources));
	const teamChats = $derived(chats.filter((chat) => sideOf(chat) === 'TEAM'));
	const unreadOf = $derived(unreadByInbox(teamChats));
	const unread = $derived(teamChats.reduce((total, chat) => total + chat.unreadCount, 0));
	const reported = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW').length);
	const nested = $derived(team.cares || team.inboxes.length > 1);

	/** What of the messages is on screen, for the entry to mark */
	function shown(params: Pick<URLSearchParams, 'get'>) {
		if (params.get('view') === 'reports') return 'reports';
		return params.get('inbox') ?? 'overview';
	}
	const current = $derived(active ? shown(page.url.searchParams) : null);
	// what the dot at the entry says, for those who cannot see it
	const attention = $derived(
		reported > 0
			? m.chatReportsWaiting({ count: reported })
			: unread > 0
				? m.chatUnreadCount({ count: unread })
				: null
	);

	// folded open while the messages are on screen; the reader may fold it either way
	let open = $state(untrack(() => active));
	$effect(() => {
		if (active) open = true;
	});
</script>

{#if !nested}
	<NavMenuButton
		href={resolve(`dashboard/${conferenceId}/team/messages`)}
		icon="ph-chats-circle"
		{active}
		title={m.chatMessages()}
		attention={unread > 0}
		attentionLabel={m.chatUnreadCount({ count: unread })}
	/>
{:else}
	<!-- contained: a long inbox name is cut off instead of widening the whole menu -->
	<li class="w-full min-w-0 [contain:inline-size]" data-testid="team-inbox-menu">
		<details class="w-full min-w-0" bind:open>
			<summary class={['flex min-w-0 items-center gap-2', active && !open && 'menu-active']}>
				<i
					aria-hidden="true"
					class="{active ? 'ph-fill' : 'ph-duotone'} ph-chats-circle w-5 text-center"
				></i>
				<span class="min-w-0 flex-1 truncate">{m.chatMessages()}</span>
				{#if attention}
					<span class="relative flex size-2.5 shrink-0">
						<span
							class="bg-error absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
						></span>
						<span class="bg-error relative inline-flex size-2.5 rounded-full"></span>
						<span class="sr-only">{attention}</span>
					</span>
				{/if}
			</summary>
			<ul class="min-w-0">
				<InboxNavEntries
					{conferenceId}
					inboxes={team.inboxes}
					{unreadOf}
					reported={team.cares ? reported : undefined}
					{current}
				/>
			</ul>
		</details>
	</li>
{/if}
