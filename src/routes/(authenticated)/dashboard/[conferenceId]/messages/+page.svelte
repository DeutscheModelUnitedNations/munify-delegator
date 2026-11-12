<script lang="ts">
	import { dev } from '$app/env';
	import { toast } from 'svelte-sonner';
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
	const settings = $derived(
		await client.liveQuery.user({ __args: { id: userId }, messageNotificationEmails: true })
	);

	// Delegates and single participants write; supervisors and the team do not take part here.
	const takesPart = $derived(
		!!participation?.delegationMember || !!participation?.singleParticipant
	);
	const delegationGroup = $derived(
		conference.assignmentReleased && !!participation?.delegationMember?.delegation.assignedRole
	);
	const canStart = $derived(conference.messagingEnabled && takesPart);

	let pickerOpen = $state(false);

	async function setNotificationEmails(enabled: boolean) {
		const promise = Promise.resolve(
			client.mutate.setMessageNotificationEmails({ __args: { enabled } })
		);
		toast.promise(promise, {
			loading: m.chatSaving(),
			success: enabled ? m.chatNotificationsOn() : m.chatNotificationsOff(),
			error: m.chatSaveFailed()
		});
		await promise;
	}
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}{conference.title} – {m.chatMessages()}</title>
</svelte:head>

<div class="flex w-full flex-col gap-4 p-4 max-sm:px-0">
	<!-- on a phone an open chat takes the screen; its own back button leads here again -->
	<div class={['contents', params.chat && 'max-md:hidden']}>
		<BackToDashboard {conferenceId} />
	</div>
	<header class={['flex flex-col gap-2', params.chat && 'max-md:hidden']}>
		<AccentStripe />
		<h1 class="text-3xl font-bold tracking-tight">{m.chatMessages()}</h1>
		<p class="text-base-content/70 max-w-3xl">{m.chatPageDescription()}</p>
	</header>

	{#if !conference.messagingEnabled && chats.length === 0}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-xl p-5">
			<i aria-hidden="true" class="ph-duotone ph-chat-slash text-2xl"></i>
			<p>{m.chatRefusedDisabled()}</p>
		</div>
	{:else if !takesPart && chats.length === 0}
		<div class="bg-base-200 text-base-content/70 flex items-start gap-3 rounded-xl p-5">
			<i aria-hidden="true" class="ph-duotone ph-chat-slash text-2xl"></i>
			<p>{m.chatOnlyParticipants()}</p>
		</div>
	{:else}
		{#if conference.messagingEnabled && takesPart && !conference.assignmentReleased}
			<p
				class="text-base-content/70 flex items-start gap-2 text-sm"
				data-testid="chat-before-release"
			>
				<i aria-hidden="true" class="ph-duotone ph-info mt-0.5"></i>
				{m.chatBeforeReleaseHint()}
			</p>
		{/if}

		<ChatWorkspace {chats} selectedId={params.chat ?? null} onSelect={(id) => (params.chat = id)}>
			{#snippet listHeader()}
				<ChatListHeader
					title={m.chatChats()}
					onNew={canStart ? () => (pickerOpen = true) : undefined}
				/>
			{/snippet}
			{#snippet emptyList()}
				<div class="text-base-content/60 flex flex-col items-center gap-3 px-4 py-10 text-center">
					<i aria-hidden="true" class="ph-duotone ph-chats text-4xl"></i>
					<p>{m.chatNoChatsYet()}</p>
					{#if canStart}
						<button
							type="button"
							class="btn btn-primary btn-sm"
							onclick={() => (pickerOpen = true)}
						>
							{m.chatWriteFirstMessage()}
						</button>
					{/if}
				</div>
			{/snippet}
			{#snippet listFooter()}
				<label
					class="border-base-300 flex cursor-pointer items-center gap-3 border-t px-4 py-3 text-sm"
				>
					<input
						type="checkbox"
						class="toggle toggle-primary toggle-sm"
						checked={settings.messageNotificationEmails}
						onchange={(event) => setNotificationEmails(event.currentTarget.checked)}
						data-testid="chat-notification-emails"
					/>
					<span class="text-base-content/80">{m.chatNotificationEmails()}</span>
				</label>
			{/snippet}
		</ChatWorkspace>
	{/if}
</div>

<NewChatDialog
	bind:open={pickerOpen}
	{conferenceId}
	mode="participant"
	{delegationGroup}
	onOpened={(chatId) => (params.chat = chatId)}
/>
