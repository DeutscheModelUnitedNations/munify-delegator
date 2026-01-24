<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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

<div class="mx-auto max-w-7xl space-y-8">
	<!-- Hero Header Section -->
	<section
		class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-8 shadow-xl"
	>
		<!-- Animated Background Blobs -->
		<div
			class="floating-blob pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-r from-indigo-400/20 to-purple-400/20 blur-3xl"
			style="animation-delay: 0s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-3xl"
			style="animation-delay: 5s;"
			aria-hidden="true"
		></div>

		<div class="relative z-10">
			<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<!-- Title Area -->
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg"
					>
						<i class="fa-solid fa-clock-rotate-left text-2xl text-white"></i>
					</div>
					<div>
						<p class="text-xs font-semibold uppercase tracking-widest text-base-content/60 mb-1">
							{m.messagingMessaging()}
						</p>
						<h1
							class="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent sm:text-4xl"
						>
							{m.messagingSentHistory()}
						</h1>
						<p class="text-base text-base-content/70 mt-1">
							{m.messageReviewDeliveryStatus()}
						</p>
					</div>
				</div>

				<!-- Navigation Tabs -->
				<nav
					class="inline-flex gap-2 bg-base-100/80 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-base-300/50"
				>
					<a
						class="px-4 py-2 rounded-xl font-medium transition-all duration-300 text-base-content/70 hover:bg-base-200/80"
						href={basePath}
					>
						{m.messagingOverview()}
					</a>
					<a
						class="px-4 py-2 rounded-xl font-medium transition-all duration-300 text-base-content/70 hover:bg-base-200/80"
						href={`${basePath}/compose`}
					>
						{m.messageCompose()}
					</a>
					<a
						class="px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
						href={`${basePath}/history`}
						aria-current="page"
					>
						{m.messageHistory()}
					</a>
				</nav>
			</div>
		</div>
	</section>

	<!-- Main Content -->
	<section
		class="fade-in rounded-3xl border-2 border-base-300/50 bg-base-100 shadow-2xl overflow-hidden"
	>
		<!-- Table Header -->
		<div
			class="border-b-2 border-base-300/50 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 px-8 py-6"
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500"
					>
						<i class="fa-solid fa-list-check text-white"></i>
					</div>
					<h2
						class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
					>
						{m.messagingDeliveryLog()}
					</h2>
				</div>
				<a
					href={`${basePath}/compose`}
					class="btn btn-lg gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105"
				>
					<i class="fa-solid fa-paper-plane"></i>
					{m.messagingNewMessage()}
				</a>
			</div>
		</div>

		<!-- Alert -->
		{#if loadError}
			<div
				class="m-6 mb-0 alert bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 shadow-xl rounded-2xl"
			>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
						<i class="fa-solid fa-triangle-exclamation text-xl text-red-600"></i>
					</div>
					<span class="font-semibold text-red-800 dark:text-red-200">{loadError}</span>
				</div>
			</div>
		{/if}

		<!-- Table Content -->
		<div class="overflow-x-auto p-6">
			{#if messages.length === 0}
				<div class="flex flex-col items-center justify-center py-16 px-6 text-center">
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-base-200 mb-4">
						<i class="fa-solid fa-inbox text-3xl text-base-content/30"></i>
					</div>
					<h3 class="text-xl font-bold text-base-content/80 mb-2">No Messages Yet</h3>
					<p class="text-base-content/60 mb-6 max-w-md">
						{m.messageNoMessagesSent()}
					</p>
					<a
						href={`${basePath}/compose`}
						class="btn btn-lg gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white shadow-xl"
					>
						<i class="fa-solid fa-paper-plane"></i>
						Send Your First Message
					</a>
				</div>
			{:else}
				<table class="table">
					<thead>
						<tr class="border-base-300">
							<th class="bg-base-200/50 text-base font-bold">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-user text-indigo-600"></i>
									{m.messageRecipient()}
								</div>
							</th>
							<th class="bg-base-200/50 text-base font-bold">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-heading text-purple-600"></i>
									{m.messageSubject()}
								</div>
							</th>
							<th class="bg-base-200/50 text-base font-bold">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-calendar text-pink-600"></i>
									{m.messagingSent()}
								</div>
							</th>
							<th class="bg-base-200/50 text-base font-bold">
								<div class="flex items-center gap-2">
									<i class="fa-solid fa-circle-check text-emerald-600"></i>
									{m.messagingStatus()}
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each messages as msg}
							<tr class="table-row-hover border-base-300">
								<td class="font-semibold">
									<div class="flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10"
										>
											<i class="fa-solid fa-user text-indigo-600 text-xs"></i>
										</div>
										{msg.recipientLabel}
									</div>
								</td>
								<td class="text-base-content/80">{msg.subject}</td>
								<td class="text-sm text-base-content/60">
									<div class="flex items-center gap-2">
										<i class="fa-solid fa-clock text-xs"></i>
										{new Date(msg.sentAt).toLocaleString()}
									</div>
								</td>
								<td>
									{#if msg.status.toLowerCase() === 'delivered' || msg.status.toLowerCase() === 'sent'}
										<span
											class="badge badge-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-2"
										>
											<i class="fa-solid fa-circle-check"></i>
											{msg.status}
										</span>
									{:else if msg.status.toLowerCase() === 'pending'}
										<span
											class="badge badge-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-2"
										>
											<i class="fa-solid fa-clock"></i>
											{msg.status}
										</span>
									{:else if msg.status.toLowerCase() === 'failed'}
										<span
											class="badge badge-lg bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 gap-2"
										>
											<i class="fa-solid fa-circle-xmark"></i>
											{msg.status}
										</span>
									{:else}
										<span class="badge badge-lg badge-outline gap-2">
											<i class="fa-solid fa-circle"></i>
											{msg.status}
										</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</section>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(20px, -15px) scale(1.03);
		}
		66% {
			transform: translate(-15px, 15px) scale(0.97);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.floating-blob {
		animation: float 15s ease-in-out infinite;
	}

	.fade-in {
		animation: fade-in 0.5s ease-out forwards;
	}

	.table-row-hover:hover {
		background: linear-gradient(90deg, rgba(139, 92, 246, 0.05), transparent);
		transform: scale(1.005);
		transition: all 0.2s ease;
	}
</style>
