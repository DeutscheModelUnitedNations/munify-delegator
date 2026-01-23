<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	type HistoryItem = {
		recipientLabel: string;
		subject: string;
		sentAt: string;
		status: string;
	};
	type HistoryPageData = PageData & {
		items?: HistoryItem[];
		historyLoadError?: string;
	};

	export let data: HistoryPageData;

	let messages: HistoryItem[] = [];
	let loadError = '';

	$: conferenceId = $page.params.conferenceId;
	$: basePath = `/dashboard/${conferenceId}/messaging`;
	$: messages = data.items ?? [];
	$: loadError = data.historyLoadError ?? '';
</script>

<section class="mb-6 rounded-box bg-base-200/70 p-5 sm:p-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<p class="text-xs uppercase tracking-[0.2em] text-base-content/60">Messaging</p>
			<h2 class="text-2xl font-semibold">Sent history</h2>
			<p class="text-sm text-base-content/70">
				Review delivery status and message activity for this conference.
			</p>
		</div>
		<nav class="tabs tabs-boxed bg-base-100/80 p-1">
			<a class="tab" href={basePath}>Overview</a>
			<a class="tab" href={`${basePath}/compose`}>Compose</a>
			<a class="tab tab-active" href={`${basePath}/history`} aria-current="page">History</a>
		</nav>
	</div>
</section>

<section class="card bg-base-100 shadow-sm">
	<div class="card-body gap-4">
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<h3 class="text-lg font-semibold">Delivery log</h3>
			<a href={`${basePath}/compose`} class="btn btn-primary btn-sm">
				<i class="fa-solid fa-paper-plane"></i>
				New message
			</a>
		</div>

		{#if loadError}
			<div class="alert alert-error">
				<i class="fa-solid fa-triangle-exclamation"></i>
				<span>{loadError}</span>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Recipient</th>
						<th>Subject</th>
						<th>Sent</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#if messages.length === 0}
						<tr>
							<td colspan="4">
								<div class="text-sm text-base-content/60">
									No messages sent yet. Send your first update from the compose page.
								</div>
							</td>
						</tr>
					{:else}
						{#each messages as m}
							<tr>
								<td class="font-medium">{m.recipientLabel}</td>
								<td>{m.subject}</td>
								<td class="text-sm text-base-content/70">
									{new Date(m.sentAt).toLocaleString()}
								</td>
								<td>
									<span class="badge badge-outline">{m.status}</span>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</section>
