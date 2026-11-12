<script lang="ts">
	import { untrack } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChats } from '#lib/api/chats';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canManageParticipants } from '#lib/helpers/teamAccess';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import ChatListHeader from '#lib/components/chat/ChatListHeader.svelte';
	import ChatWorkspace from '#lib/components/chat/ChatWorkspace.svelte';
	import NewChatDialog from '#lib/components/chat/NewChatDialog.svelte';
	import { chatTitle, sideOf } from '#lib/components/chat/chatLabels';
	import ChatReports from './ChatReports.svelte';
	import InboxChips from './InboxChips.svelte';
	import SettledReports from './SettledReports.svelte';
	import { inboxKey, inboxesOf } from './teamInboxes';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname (see the members page).
	const conferenceId = untrack(() => routeParams.conferenceId);
	const params = queryParameters({ chat: true, view: true, inbox: true, paper: true });

	const me = await getCurrentUser();
	const [access, conference, chats, functions] = $derived(
		await Promise.all([
			fetchTeamAccess(conferenceId),
			client.liveQuery.conference({
				__args: { id: conferenceId },
				messagingEnabled: true,
				assignmentReleased: true
			}),
			fetchChats({ conferenceId }),
			client.liveQuery.teamFunctions({
				__args: {
					where: { teamMember: { userId: { eq: me.sub }, conferenceId: { eq: conferenceId } } }
				},
				kind: true,
				committeeId: true,
				committee: { abbreviation: true }
			})
		])
	);
	const cares = $derived(canManageParticipants(access));
	const reports = $derived(
		cares
			? await client.liveQuery.chatReports({
					__args: {
						where: { conferenceId: { eq: conferenceId } },
						orderBy: { createdAt: 'desc' }
					},
					chatId: true,
					reason: true,
					status: true,
					createdAt: true,
					resolvedAt: true,
					reporterName: true
				})
			: []
	);

	const inboxes = $derived(inboxesOf({ cares, functions }));
	const teamChats = $derived(chats.filter((chat) => sideOf(chat) === 'TEAM'));
	const reviewChats = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW'));
	const openReports = $derived(reports.filter((report) => report.status === 'OPEN'));
	const settledReports = $derived(reports.filter((report) => report.status !== 'OPEN'));

	const view = $derived(params.view === 'reports' && cares ? 'reports' : 'inboxes');
	const shownChats = $derived(
		view === 'reports'
			? reviewChats
			: teamChats.filter((chat) => !params.inbox || inboxKey(chat) === params.inbox)
	);
	const unreadOf = (key: string) =>
		teamChats
			.filter((chat) => inboxKey(chat) === key)
			.reduce((total, chat) => total + chat.unreadCount, 0);

	let pickerOpen = $state(false);

	function show(next: 'inboxes' | 'reports') {
		params.chat = null;
		params.view = next === 'reports' ? 'reports' : null;
	}

	const titleOfChat = (chatId: string) => {
		const chat = reviewChats.find((candidate) => candidate.id === chatId);
		return chat ? chatTitle(chat) : undefined;
	};
</script>

<div class="flex flex-col gap-4 py-4 sm:p-6">
	<header class={['flex flex-col gap-1', params.chat && 'max-md:hidden']}>
		<h1 class="text-2xl font-bold tracking-tight">{m.chatMessages()}</h1>
		<p class="text-base-content/70 max-w-3xl">{m.chatTeamPageDescription()}</p>
	</header>

	{#if !conference.messagingEnabled}
		<div class="alert alert-warning" role="status">
			<i aria-hidden="true" class="ph-duotone ph-chat-slash"></i>
			<span>{m.chatTeamDisabledHint()}</span>
		</div>
	{/if}

	{#if cares}
		<Tabs>
			<Tab
				title={m.chatInboxes()}
				icon="tray"
				active={view === 'inboxes'}
				onclick={() => show('inboxes')}
			/>
			<Tab
				title={openReports.length > 0
					? m.chatReportsWithCount({ count: openReports.length })
					: m.chatReports()}
				icon="flag"
				active={view === 'reports'}
				onclick={() => show('reports')}
			/>
		</Tabs>
	{/if}

	{#if view === 'reports'}
		<ChatReports
			reports={openReports}
			titleOf={titleOfChat}
			onRead={(chatId) => (params.chat = chatId)}
		/>
	{:else if inboxes.length === 0}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-xl p-5">
			<i aria-hidden="true" class="ph-duotone ph-tray text-2xl"></i>
			<p>{m.chatNoInboxHint()}</p>
		</div>
	{/if}

	{#if view === 'reports' ? reviewChats.length > 0 : inboxes.length > 0}
		<ChatWorkspace
			chats={shownChats}
			selectedId={params.chat ?? null}
			onSelect={(id) => (params.chat = id)}
			showInbox={view === 'inboxes' && !params.inbox && inboxes.length > 1}
			paperId={params.paper ?? null}
			onPaperSent={() => (params.paper = null)}
		>
			{#snippet listHeader()}
				<ChatListHeader
					title={view === 'reports' ? m.chatReportedChats() : m.chatChats()}
					onNew={view === 'inboxes' && conference.messagingEnabled && conference.assignmentReleased
						? () => (pickerOpen = true)
						: undefined}
				>
					{#if view === 'inboxes' && inboxes.length > 1}
						<InboxChips
							{inboxes}
							selected={params.inbox ?? null}
							{unreadOf}
							onSelect={(key) => (params.inbox = key)}
						/>
					{/if}
				</ChatListHeader>
			{/snippet}
			{#snippet emptyList()}
				<div class="text-base-content/60 flex flex-col items-center gap-3 px-4 py-10 text-center">
					<i aria-hidden="true" class="ph-duotone ph-tray text-4xl"></i>
					<p>{m.chatInboxEmpty()}</p>
				</div>
			{/snippet}
		</ChatWorkspace>
	{/if}

	{#if view === 'reports'}
		<SettledReports reports={settledReports} />
	{/if}
</div>

<NewChatDialog
	bind:open={pickerOpen}
	{conferenceId}
	mode="team"
	onOpened={(chatId) => (params.chat = chatId)}
/>
