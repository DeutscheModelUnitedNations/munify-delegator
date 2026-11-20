<script lang="ts">
	import { untrack } from 'svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChats } from '#lib/api/chats';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import NewChatDialog from '#lib/components/chat/NewChatDialog.svelte';
	import { sideOf } from '#lib/components/chat/chatLabels';
	import ReportDesk from './ReportDesk.svelte';
	import SettledReports from './SettledReports.svelte';
	import { fetchTeamInboxes, teamInboxesOf } from './fetchTeamInboxes';
	import InboxChats from './InboxChats.svelte';
	import { inboxFilter, inboxGroups } from './teamInboxes';
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
					resolvedByName: true,
					hiddenMessages: {
						id: true,
						body: true,
						createdAt: true,
						authorName: true,
						hiddenAt: true,
						hiddenReason: true,
						hiddenByName: true
					}
				})
			: []
	);

	const inboxes = $derived(team.inboxes);
	const teamChats = $derived(chats.filter((chat) => sideOf(chat) === 'TEAM'));
	const reviewChats = $derived(chats.filter((chat) => sideOf(chat) === 'REVIEW'));
	const openReports = $derived(reports.filter((report) => report.status === 'OPEN'));
	const settledReports = $derived(reports.filter((report) => report.status !== 'OPEN'));

	const reporting = $derived(params.view === 'reports' && cares);
	const messenger = $derived(!reporting && inboxes.length > 0);
	const showArchive = $derived(params.archive === '1');
	const selectedId = $derived(params.chat ?? null);
	// an inbox only the URL still names (a function taken away) narrows nothing
	const selectedInbox = $derived(
		inboxFilter({ groups: inboxGroups(inboxes), selected: params.inbox })?.key ?? null
	);
	const paperId = $derived(params.paper ?? null);
	// the team starts a chat with a seated participant once the roles are released, whatever the
	// switch says: it is only about participants writing each other
	const onNew = $derived(conference.assignmentReleased ? () => (pickerOpen = true) : undefined);
	let pickerOpen = $state(false);
</script>

<div class={['flex flex-col gap-4 py-4 sm:p-6', messenger && 'messenger-page']}>
	<header class={['flex flex-col gap-1', selectedId && 'max-md:hidden']}>
		<h1 class="text-2xl font-bold tracking-tight">
			{reporting ? m.chatReports() : m.chatMessages()}
		</h1>
	</header>

	{#if !conference.messagingEnabled}
		<div class="alert alert-info" role="status">
			<i aria-hidden="true" class="ph-duotone ph-info"></i>
			<span>{m.chatTeamDisabledHint()}</span>
		</div>
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
	{:else if messenger}
		<InboxChats
			{conferenceId}
			chats={teamChats}
			{inboxes}
			{selectedInbox}
			onInbox={(key) => (params.inbox = key)}
			{onNew}
			{selectedId}
			onSelect={(id) => (params.chat = id)}
			{showArchive}
			onArchive={(shown) => (params.archive = shown ? '1' : null)}
			reported={cares ? reviewChats.length : undefined}
			{paperId}
			onPaperSent={() => (params.paper = null)}
		/>
	{:else}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-box p-5">
			<i aria-hidden="true" class="ph-duotone ph-tray text-2xl"></i>
			<p>{m.chatNoInboxHint()}</p>
		</div>
	{/if}
</div>

<NewChatDialog
	bind:open={pickerOpen}
	{conferenceId}
	mode="team"
	onOpened={(chatId) => (params.chat = chatId)}
/>

<style>
	/* The messenger reaches down to the window's edge; the main area above it pads by 1rem. */
	.messenger-page {
		height: max(32rem, calc(100dvh - var(--header-height, 4rem) - 1rem));
	}
</style>
