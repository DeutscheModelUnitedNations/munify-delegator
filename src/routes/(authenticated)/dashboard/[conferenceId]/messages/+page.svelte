<script lang="ts">
	import { untrack } from 'svelte';
	import { dev } from '$app/env';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChats } from '#lib/api/chats';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import AccentStripe from '#lib/components/AccentStripe.svelte';
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import ChatListHeader from '#lib/components/chat/ChatListHeader.svelte';
	import ChatWorkspace from '#lib/components/chat/ChatWorkspace.svelte';
	import NewChatDialog from '#lib/components/chat/NewChatDialog.svelte';
	import ChatSettingsMenu from './ChatSettingsMenu.svelte';
	import ChatStartPane from './ChatStartPane.svelte';
	import { messagesPageState } from './messagesPageState';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId);
	const params = queryParameters({ chat: true });

	const [conference, chats, participation, me] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				title: true,
				messagingEnabled: true,
				assignmentReleased: true
			}),
			fetchChats({ conferenceId }),
			fetchMyParticipation(conferenceId),
			getCurrentUser()
		])
	);
	const userId = $derived(me.sub);

	// a delegation's group is open from the registration on, and closes for a rejected delegation
	const delegationGroup = $derived(
		!!participation?.delegationMember &&
			(!conference.assignmentReleased || !!participation.delegationMember.delegation.assignedRole)
	);
	const view = $derived(
		messagesPageState({
			messagingEnabled: conference.messagingEnabled,
			assignmentReleased: conference.assignmentReleased,
			takesPart: !!participation?.delegationMember || !!participation?.singleParticipant,
			hasChats: chats.length > 0
		})
	);
	const othersHint = $derived(
		view.othersClosed === 'beforeRelease'
			? { testId: 'chat-before-release', text: m.chatBeforeReleaseHint() }
			: view.othersClosed === 'disabled'
				? { testId: 'chat-others-disabled', text: m.chatOtherDelegationsDisabledHint() }
				: null
	);
	const onNew = $derived(view.canStart ? () => (pickerOpen = true) : undefined);

	let pickerOpen = $state(false);
	// the chat on screen: the header steps back on a phone once the transition swaps it in
	let shownChat = $state<string | null>(untrack(() => params.chat ?? null));
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}{conference.title} – {m.chatMessages()}</title>
</svelte:head>

<div class="messages-page flex w-full flex-col gap-3 p-4 max-sm:px-0">
	<!-- on a phone an open chat takes the screen; its own back button leads here again -->
	<div class={['contents', shownChat && 'max-md:hidden']}>
		<BackToDashboard {conferenceId} />
	</div>
	<header class={['flex flex-col gap-2', shownChat && 'max-md:hidden']}>
		<AccentStripe />
		<h1 class="text-2xl font-bold tracking-tight">{m.chatMessages()}</h1>
		<!-- wider screens say this beside the list, where nothing is open yet -->
		<p class="text-base-content/70 max-w-3xl md:hidden">{m.chatPageDescription()}</p>
	</header>

	{#if view.closed}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-box p-5">
			<i aria-hidden="true" class="ph-duotone ph-chat-slash text-2xl"></i>
			<p>{m.chatOnlyParticipants()}</p>
		</div>
	{:else}
		{#if othersHint}
			<p
				class="text-base-content/70 flex items-start gap-2 text-sm"
				data-testid={othersHint.testId}
			>
				<i aria-hidden="true" class="ph-duotone ph-info mt-0.5"></i>
				{othersHint.text}
			</p>
		{/if}

		<ChatWorkspace
			{chats}
			selectedId={params.chat ?? null}
			onSelect={(id) => (params.chat = id)}
			fill
			bind:shownId={shownChat}
			noSelection={onNew && startPane}
		>
			{#snippet listHeader()}
				<ChatListHeader title={m.chatChats()} {onNew}>
					{#snippet actions()}
						<ChatSettingsMenu {userId} />
					{/snippet}
				</ChatListHeader>
			{/snippet}
			{#snippet emptyList()}
				<div class="text-base-content/60 flex flex-col items-center gap-3 px-4 py-10 text-center">
					<i aria-hidden="true" class="ph-duotone ph-chats text-4xl"></i>
					<p>{m.chatNoChatsYet()}</p>
					{#if onNew}
						<button type="button" class="btn btn-primary btn-sm" onclick={onNew}>
							{m.chatWriteFirstMessage()}
						</button>
					{/if}
				</div>
			{/snippet}
		</ChatWorkspace>
	{/if}
</div>

{#snippet startPane()}
	<ChatStartPane
		{conferenceId}
		{delegationGroup}
		onNew={() => (pickerOpen = true)}
		onOpened={(chatId) => (params.chat = chatId)}
	/>
{/snippet}

<NewChatDialog
	bind:open={pickerOpen}
	{conferenceId}
	mode="participant"
	{delegationGroup}
	onOpened={(chatId) => (params.chat = chatId)}
/>

<style>
	/* The messenger reaches down to the window's edge; the main area above it pads by 1rem. */
	.messages-page {
		height: max(32rem, calc(100dvh - var(--header-height, 4rem) - 1rem));
	}
</style>
