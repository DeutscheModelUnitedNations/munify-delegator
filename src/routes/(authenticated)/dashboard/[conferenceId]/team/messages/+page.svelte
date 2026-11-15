<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChats } from '#lib/api/chats';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import NewChatDialog from '#lib/components/chat/NewChatDialog.svelte';
	import { inboxName, sideOf } from '#lib/components/chat/chatLabels';
	import ReportDesk from './ReportDesk.svelte';
	import SettledReports from './SettledReports.svelte';
	import { fetchTeamInboxes, teamInboxesOf } from './fetchTeamInboxes';
	import InboxOverview from './InboxOverview.svelte';
	import InboxChats from './InboxChats.svelte';
	import { inboxKey } from './teamInboxes';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname (see the members page).
	const conferenceId = untrack(() => routeParams.conferenceId);
	const params = queryParameters({
		chat: true,
		view: true,
		inbox: true,
		paper: true,
		archive: true
	});

	const me = await getCurrentUser();
	const [conference, chats, sources] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				messagingEnabled: true,
				assignmentReleased: true
			}),
			fetchChats({ conferenceId }),
			fetchTeamInboxes({ conferenceId, userId: me.sub })
		])
	);
	const team = $derived(teamInboxesOf(sources));
	const cares = $derived(team.cares);
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
					reporterName: true,
					reporterParticipantId: true,
					resolutionNote: true,
					resolvedByName: true
				})
			: []
	);

	const inboxes = $derived(team.inboxes);
	const teamChats = $derived(chats.filter((chat) => sideOf(chat) === 'TEAM'));
	const reviewChats = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW'));
	const openReports = $derived(reports.filter((report) => report.status === 'OPEN'));
	const settledReports = $derived(reports.filter((report) => report.status !== 'OPEN'));

	const view = $derived(params.view === 'reports' && cares ? 'reports' : 'inboxes');
	const showArchive = $derived(params.archive === '1');
	const inboxChats = $derived(
		teamChats.filter((chat) => !params.inbox || inboxKey(chat) === params.inbox)
	);
	let pickerOpen = $state(false);

	const reporting = $derived(view === 'reports');
	const selectedId = $derived(params.chat ?? null);
	const selectedInbox = $derived(params.inbox ?? null);
	// the team menu picks the inbox; the list says which one it shows
	const shownInbox = $derived(inboxes.find((inbox) => inbox.key === selectedInbox));
	// several inboxes start at their overview; one inbox, or a chat opened by its link, at the chats
	const several = $derived(cares || inboxes.length > 1);
	const overview = $derived(several && !reporting && !selectedInbox && !selectedId);
	const listTitle = $derived(
		!shownInbox ? m.chatChats() : shownInbox.own ? m.chatInboxTrustedOwn() : inboxName(shownInbox)
	);
	const paperId = $derived(params.paper ?? null);
	const severalInboxes = $derived(inboxes.length > 1);
	// the team starts a chat with a participant once the roles are released
	const onNew = $derived(
		conference.messagingEnabled && conference.assignmentReleased
			? () => (pickerOpen = true)
			: undefined
	);
</script>

<div class="flex flex-col gap-4 py-4 sm:p-6">
	<header class={['flex flex-col gap-1', selectedId && 'max-md:hidden']}>
		<h1 class="text-2xl font-bold tracking-tight">{m.chatMessages()}</h1>
		<p class="text-base-content/70 max-w-3xl">{m.chatTeamPageDescription()}</p>
	</header>

	{#if !conference.messagingEnabled}
		<div class="alert alert-warning" role="status">
			<i aria-hidden="true" class="ph-duotone ph-chat-slash"></i>
			<span>{m.chatTeamDisabledHint()}</span>
		</div>
	{/if}

	{#if several && !overview}
		<a
			href={resolve(`dashboard/${conferenceId}/team/messages`)}
			class={[
				'link link-hover flex items-center gap-1.5 self-start text-sm',
				selectedId && 'max-md:hidden'
			]}
			data-testid="team-inbox-back"
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
			{m.chatInboxOverview()}
		</a>
	{/if}

	{#if reporting}
		<ReportDesk
			{conferenceId}
			reports={openReports}
			chats={reviewChats}
			{selectedId}
			onSelect={(chatId) => (params.chat = chatId)}
		/>
		<SettledReports reports={settledReports} />
	{:else if inboxes.length === 0}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-box p-5">
			<i aria-hidden="true" class="ph-duotone ph-tray text-2xl"></i>
			<p>{m.chatNoInboxHint()}</p>
		</div>
	{:else if overview}
		<InboxOverview
			{conferenceId}
			{inboxes}
			chats={teamChats}
			reported={cares ? reviewChats.length : undefined}
		/>
	{:else}
		<InboxChats
			chats={inboxChats}
			title={listTitle}
			{onNew}
			{selectedId}
			onSelect={(id) => (params.chat = id)}
			showInbox={severalInboxes && !selectedInbox}
			{showArchive}
			onArchive={(shown) => (params.archive = shown ? '1' : null)}
			{paperId}
			onPaperSent={() => (params.paper = null)}
		/>
	{/if}

	{#if inboxes.length > 0}
		<a
			href={resolve('my-account/notifications')}
			class="link link-hover text-base-content/70 flex items-center gap-1.5 self-start text-sm"
			data-testid="team-notifications-link"
		>
			<i aria-hidden="true" class="ph-duotone ph-bell"></i>
			{m.chatTeamNotificationsLink()}
		</a>
	{/if}
</div>

<NewChatDialog
	bind:open={pickerOpen}
	{conferenceId}
	mode="team"
	onOpened={(chatId) => (params.chat = chatId)}
/>
