<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { graphql } from '$houdini';
	import type { PageData } from './$types';
	import Modal from '$lib/components/Modal.svelte';

	type InboxItem = {
		id: string;
		senderLabel: string;
		subject: string;
		body: string;
		sentAt: string;
		hasThread: boolean;
	};

	type ThreadMsg = {
		id: string;
		subject: string;
		body: string;
		sentAt: string;
		senderLabel: string;
		senderUserId: string;
		isCurrentUser: boolean;
	};

	type InboxPageData = PageData & {
		items?: InboxItem[];
		inboxLoadError?: string;
	};

	const { data }: { data: InboxPageData } = $props();

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const messages = $derived(data.items ?? []);
	const loadError = $derived(data.inboxLoadError ?? '');

	let selectedMessage = $state<InboxItem | null>(null);
	let previewOpen = $state(false);
	let threadMessages = $state<ThreadMsg[]>([]);
	let threadVisible = $state(false);
	let threadLoading = $state(false);

	const getMessageThreadQuery = graphql(`
		query GetMessageThreadQuery($messageAuditId: String!, $conferenceId: String!) {
			getMessageThread(messageAuditId: $messageAuditId, conferenceId: $conferenceId) {
				id
				subject
				body
				sentAt
				senderLabel
				senderUserId
				isCurrentUser
			}
		}
	`);

	function openPreview(msg: InboxItem) {
		selectedMessage = msg;
		previewOpen = true;
		threadMessages = [];
		threadVisible = false;
	}

	function closePreview() {
		selectedMessage = null;
		previewOpen = false;
		threadMessages = [];
		threadVisible = false;
	}

	async function toggleThread() {
		if (threadVisible) {
			threadVisible = false;
			return;
		}
		if (!selectedMessage) return;

		threadLoading = true;
		try {
			const result = await getMessageThreadQuery.fetch({
				variables: {
					messageAuditId: selectedMessage.id,
					conferenceId
				}
			});
			threadMessages = (result.data?.getMessageThread ?? []) as ThreadMsg[];
			threadVisible = true;
		} catch (e) {
			console.error('Failed to load thread', e);
		} finally {
			threadLoading = false;
		}
	}
</script>

<div class="flex flex-col gap-6 w-full max-w-5xl">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">{m.messagingInbox()}</h1>
			<p class="text-base-content/70 mt-1">{m.messagingInboxDescription()}</p>
		</div>
		<a href={`${basePath}/compose`} class="btn btn-primary">
			<i class="fa-solid fa-paper-plane"></i>
			{m.messagingNewMessage()}
		</a>
	</div>

	<!-- Info Alert -->
	<div role="alert" class="alert alert-info">
		<i class="fa-duotone fa-circle-info text-lg"></i>
		<span>{m.messagingInboxExplanation()}</span>
	</div>

	<!-- Error Alert -->
	{#if loadError}
		<div role="alert" class="alert alert-error">
			<i class="fa-duotone fa-triangle-exclamation"></i>
			<span>{loadError}</span>
		</div>
	{/if}

	<!-- Table Card -->
	<div class="card bg-base-100 border border-base-200 shadow-sm">
		<div class="card-body p-0">
			{#if messages.length === 0}
				<div class="flex flex-col items-center justify-center py-16 px-6 text-center">
					<i class="fa-duotone fa-inbox text-4xl mb-4"></i>
					<h3 class="text-xl font-bold text-base-content/80 mb-2">
						{m.messagingInboxEmpty()}
					</h3>
					<p class="text-base-content/60 mb-6 max-w-md">
						{m.messagingInboxEmptyDescription()}
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>{m.messagingInboxSender()}</th>
								<th>{m.messageSubject()}</th>
								<th>{m.messagingInboxReceived()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each messages as msg}
								<tr class="hover">
									<td class="font-semibold">{msg.senderLabel}</td>
									<td class="text-base-content/80">{msg.subject}</td>
									<td class="text-sm text-base-content/60">
										{new Date(msg.sentAt).toLocaleString()}
									</td>
									<td>
										<div class="flex items-center gap-1">
											{#if msg.hasThread}
												<span class="badge badge-ghost badge-sm gap-1">
													<i class="fa-duotone fa-messages text-xs"></i>
												</span>
											{/if}
											<button
												class="btn btn-ghost btn-sm"
												title={m.messagingPreview()}
												onclick={() => openPreview(msg)}
											>
												<i class="fa-duotone fa-eye"></i>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Preview Modal -->
<Modal bind:open={previewOpen} title={m.messagingPreview()} onclose={closePreview}>
	{#if selectedMessage}
		<div class="flex flex-col gap-4">
			<div>
				<span class="text-sm font-bold text-base-content/60">{m.messagingInboxSender()}</span>
				<p class="font-semibold">{selectedMessage.senderLabel}</p>
			</div>
			<div>
				<span class="text-sm font-bold text-base-content/60">{m.messageSubject()}</span>
				<p>{selectedMessage.subject}</p>
			</div>
			<div>
				<span class="text-sm font-bold text-base-content/60">{m.messagingInboxReceived()}</span>
				<p class="text-sm">{new Date(selectedMessage.sentAt).toLocaleString()}</p>
			</div>
			<div class="divider my-0"></div>
			<div>
				<p class="whitespace-pre-line">{selectedMessage.body}</p>
			</div>

			<!-- Thread toggle -->
			{#if selectedMessage.hasThread}
				<div class="divider my-0"></div>
				<button
					class="btn btn-ghost btn-sm self-start gap-2"
					onclick={toggleThread}
					disabled={threadLoading}
				>
					{#if threadLoading}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<i class="fa-duotone fa-messages"></i>
					{/if}
					{threadVisible ? m.messagingHideThread() : m.messagingShowThread()}
				</button>

				{#if threadVisible && threadMessages.length > 0}
					<div class="flex flex-col gap-3 mt-2">
						<h4 class="text-sm font-bold text-base-content/60">{m.messagingThreadTitle()}</h4>
						{#each threadMessages as threadMsg}
							<div class="flex {threadMsg.isCurrentUser ? 'justify-end' : 'justify-start'}">
								<div
									class="max-w-[80%] rounded-lg p-3 {threadMsg.isCurrentUser
										? 'bg-primary/10 text-primary-content'
										: 'bg-base-200'}"
								>
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-bold">
											{threadMsg.isCurrentUser ? m.messagingYou() : threadMsg.senderLabel}
										</span>
										<span class="text-xs opacity-60">
											{new Date(threadMsg.sentAt).toLocaleString()}
										</span>
									</div>
									<p class="text-xs font-semibold opacity-70 mb-1">{threadMsg.subject}</p>
									<p class="text-sm whitespace-pre-line">{threadMsg.body}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#snippet action()}
		{#if selectedMessage}
			<a href={`${basePath}/compose?replyTo=${selectedMessage.id}`} class="btn btn-primary">
				<i class="fa-solid fa-reply"></i>
				{m.messagingReply()}
			</a>
		{/if}
		<button class="btn" onclick={closePreview}>
			{m.close()}
		</button>
	{/snippet}
</Modal>
