<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import Modal from '$lib/components/Modal.svelte';

	type HistoryItem = {
		recipientLabel: string;
		subject: string;
		body: string;
		sentAt: string;
		status: string;
	};
	type HistoryPageData = PageData & {
		items?: HistoryItem[];
		historyLoadError?: string;
	};

	const { data }: { data: HistoryPageData } = $props();

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const messages = $derived(data.items ?? []);
	const loadError = $derived(data.historyLoadError ?? '');

	let selectedMessage = $state<HistoryItem | null>(null);
	let previewOpen = $state(false);

	function openPreview(msg: HistoryItem) {
		selectedMessage = msg;
		previewOpen = true;
	}

	function closePreview() {
		selectedMessage = null;
		previewOpen = false;
	}
</script>

<div class="flex flex-col gap-6 w-full max-w-5xl">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">{m.messagingSentHistory()}</h1>
			<p class="text-base-content/70 mt-1">{m.messageReviewDeliveryStatus()}</p>
		</div>
		<a href={`${basePath}/compose`} class="btn btn-primary">
			<i class="fa-solid fa-paper-plane"></i>
			{m.messagingNewMessage()}
		</a>
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
					<i class="fa-duotone fa-inbox text-4xl text-base-coduotonentent/20 mb-4"></i>
					<h3 class="text-xl font-bold text-base-content/80 mb-2">
						{m.messagingNoMessagesYet()}
					</h3>
					<p class="text-base-content/60 mb-6 max-w-md">
						{m.messageNoMessagesSent()}
					</p>
					<a href={`${basePath}/compose`} class="btn btn-primary">
						<i class="fa-solid fa-paper-plane"></i>
						{m.messagingSendFirstMessage()}
					</a>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>{m.messageRecipient()}</th>
								<th>{m.messageSubject()}</th>
								<th>{m.messagingSent()}</th>
								<th>{m.messagingStatus()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each messages as msg}
								<tr class="hover">
									<td class="font-semibold">{msg.recipientLabel}</td>
									<td class="text-base-content/80">{msg.subject}</td>
									<td class="text-sm text-base-content/60">
										{new Date(msg.sentAt).toLocaleString()}
									</td>
									<td>
										{#if msg.status.toLowerCase() === 'delivered' || msg.status.toLowerCase() === 'sent'}
											<span class="badge badge-success gap-1">
												<i class="fa-solid fa-circle-check text-xs"></i>
												{msg.status}
											</span>
										{:else if msg.status.toLowerCase() === 'pending'}
											<span class="badge badge-warning gap-1">
												<i class="fa-solid fa-clock text-xs"></i>
												{msg.status}
											</span>
										{:else if msg.status.toLowerCase() === 'failed'}
											<span class="badge badge-error gap-1">
												<i class="fa-solid fa-circle-xmark text-xs"></i>
												{msg.status}
											</span>
										{:else}
											<span class="badge badge-ghost gap-1">
												<i class="fa-solid fa-circle text-xs"></i>
												{msg.status}
											</span>
										{/if}
									</td>
									<td>
										<button
											class="btn btn-ghost btn-sm"
											title={m.messagingPreview()}
											onclick={() => openPreview(msg)}
										>
											<i class="fa-duotone fa-eye"></i>
										</button>
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
				<span class="text-sm font-bold text-base-content/60">{m.messageRecipient()}</span>
				<p class="font-semibold">{selectedMessage.recipientLabel}</p>
			</div>
			<div>
				<span class="text-sm font-bold text-base-content/60">{m.messageSubject()}</span>
				<p>{selectedMessage.subject}</p>
			</div>
			<div class="flex items-center gap-4">
				<div>
					<span class="text-sm font-bold text-base-content/60">{m.messagingSent()}</span>
					<p class="text-sm">{new Date(selectedMessage.sentAt).toLocaleString()}</p>
				</div>
				<div>
					<span class="text-sm font-bold text-base-content/60">{m.messagingStatus()}</span>
					<div class="mt-0.5">
						{#if selectedMessage.status.toLowerCase() === 'delivered' || selectedMessage.status.toLowerCase() === 'sent'}
							<span class="badge badge-success gap-1">
								<i class="fa-duotone fa-circle-check text-xs"></i>
								{selectedMessage.status}
							</span>
						{:else if selectedMessage.status.toLowerCase() === 'pending'}
							<span class="badge badge-warning gap-1">
								<i class="fa-duotone fa-clock text-xs"></i>
								{selectedMessage.status}
							</span>
						{:else if selectedMessage.status.toLowerCase() === 'failed'}
							<span class="badge badge-error gap-1">
								<i class="fa-duotone fa-circle-xmark text-xs"></i>
								{selectedMessage.status}
							</span>
						{:else}
							<span class="badge badge-ghost gap-1">
								<i class="fa-duotone fa-circle text-xs"></i>
								{selectedMessage.status}
							</span>
						{/if}
					</div>
				</div>
			</div>
			<div class="divider my-0"></div>
			<div>
				<p class="whitespace-pre-line">{selectedMessage.body}</p>
			</div>
		</div>
	{/if}

	{#snippet action()}
		<button class="btn" onclick={closePreview}>
			{m.close()}
		</button>
	{/snippet}
</Modal>
