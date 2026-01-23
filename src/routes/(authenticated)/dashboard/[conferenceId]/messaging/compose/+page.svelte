<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import toast from 'svelte-french-toast';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';

	type Recipient = { id: string; label: string };
	type ComposePageData = PageData & {
		recipients?: Recipient[];
		recipientLoadError?: string;
	};
	type ComposeActionData = { error?: string } | null | undefined;

	export let data: ComposePageData;
	export let form: ComposeActionData;

	let recipients: Recipient[] = [];
	let selectedRecipient = '';
	let subject = '';
	let body = '';
	let actionError = '';
	let loadError = '';
	let prefilled = false;

	const getActionError = (value: unknown) => {
		if (!value || typeof value !== 'object') return '';
		const maybeError = (value as { error?: unknown }).error;
		return typeof maybeError === 'string' ? maybeError : '';
	};

	$: recipients = data.recipients ?? [];
	$: loadError = data.recipientLoadError ?? '';
	$: actionError = getActionError(form);

	$: conferenceId = $page.params.conferenceId;
	$: basePath = `/dashboard/${conferenceId}/messaging`;
	$: subjectCount = subject.length;
	$: bodyCount = body.length;

	$: userCanReceiveMail = data.conferenceQueryData?.findUniqueUser?.canReceiveDelegationMail;
	$: showReceiveMailWarning = userCanReceiveMail === false;

	$: if (!prefilled) {
		const recipientIdParam = $page.url.searchParams.get('recipientId');
		const subjectParam = $page.url.searchParams.get('subject');
		if (recipientIdParam) selectedRecipient = recipientIdParam;
		if (subjectParam) subject = subjectParam;
		prefilled = true;
	}

	const enhanceForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success(m.messageSent());
				selectedRecipient = '';
				subject = '';
				body = '';
			} else if (result.type === 'failure') {
				const errorMessage = getActionError(result.data);
				if (errorMessage === 'Recipient has not enabled messaging.') {
					toast.error(m.messageRecipientNotEnabled());
				}
			}
			await update();
		};
	};
</script>

<div class="mx-auto max-w-6xl space-y-8">
	<!-- Hero Header Section -->
	<section
		class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-indigo-500/10 p-8 shadow-xl"
	>
		<!-- Animated Background Blobs -->
		<div
			class="floating-blob pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-r from-violet-400/20 to-purple-400/20 blur-3xl"
			style="animation-delay: 0s;"
			aria-hidden="true"
		></div>
		<div
			class="floating-blob pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl"
			style="animation-delay: 5s;"
			aria-hidden="true"
		></div>

		<div class="relative z-10">
			<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<!-- Title Area -->
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg"
					>
						<i class="fa-solid fa-pen-to-square text-2xl text-white"></i>
					</div>
					<div>
						<h1
							class="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent sm:text-4xl"
						>
							{m.messageComposeMessage()}
						</h1>
						<p class="text-base text-base-content/70 mt-1">
							{m.messageSendToParticipants()}
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
						class="px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-lg"
						href={`${basePath}/compose`}
						aria-current="page"
					>
						{m.messageCompose()}
					</a>
					<a
						class="px-4 py-2 rounded-xl font-medium transition-all duration-300 text-base-content/70 hover:bg-base-200/80"
						href={`${basePath}/history`}
					>
						{m.messageHistory()}
					</a>
				</nav>
			</div>
		</div>
	</section>

	<!-- Alerts -->
	{#if actionError}
		<div
			class="fade-in alert bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 shadow-xl rounded-2xl"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
					<i class="fa-solid fa-circle-exclamation text-xl text-red-600"></i>
				</div>
				<span class="font-semibold text-red-800 dark:text-red-200">{actionError}</span>
			</div>
		</div>
	{/if}

	{#if showReceiveMailWarning}
		<div
			class="fade-in alert bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/50 shadow-xl rounded-2xl"
		>
			<div class="flex items-start gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20"
				>
					<i class="fa-solid fa-triangle-exclamation text-xl text-amber-600"></i>
				</div>
				<div>
					<span class="font-semibold text-amber-900 dark:text-amber-100 block mb-1">
						{m.messagingDisabledForAccount()}
					</span>
					<p class="text-sm text-amber-800 dark:text-amber-200">
						{m.messagingNoReplyWarning()}
						<a href="/my-account" class="font-bold underline hover:no-underline">
							{m.messagingEnableInSettings()}
						</a>
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Quick Tips Banner -->
	<div
		class="fade-in rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6 shadow-lg"
	>
		<div class="flex items-center gap-3 mb-4">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500"
			>
				<i class="fa-solid fa-lightbulb text-white"></i>
			</div>
			<h3 class="font-bold text-emerald-900 dark:text-emerald-100">Quick Tips</h3>
		</div>
		<div class="grid gap-3 sm:grid-cols-3">
			<div
				class="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-black/20 p-3 transition-all hover:bg-white/80 dark:hover:bg-black/30"
			>
				<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
				<span class="text-sm font-medium text-emerald-900 dark:text-emerald-100"
					>{m.messagingVerifyRecipient()}</span
				>
			</div>
			<div
				class="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-black/20 p-3 transition-all hover:bg-white/80 dark:hover:bg-black/30"
			>
				<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
				<span class="text-sm font-medium text-emerald-900 dark:text-emerald-100"
					>{m.messagingClearActionDeadlines()}</span
				>
			</div>
			<div
				class="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-black/20 p-3 transition-all hover:bg-white/80 dark:hover:bg-black/30"
			>
				<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
				<span class="text-sm font-medium text-emerald-900 dark:text-emerald-100"
					>{m.messagingKeepConcise()}</span
				>
			</div>
		</div>
	</div>

	<!-- Main Form -->
	<form method="POST" action="?/send" use:enhance={enhanceForm}>
		<div
			class="fade-in rounded-3xl border-2 border-base-300/50 bg-base-100 shadow-2xl overflow-hidden"
		>
			<!-- Form Header -->
			<div
				class="border-b-2 border-base-300/50 bg-gradient-to-r from-violet-500/5 to-blue-500/5 px-8 py-6"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500"
						>
							<i class="fa-solid fa-file-lines text-white"></i>
						</div>
						<h2
							class="text-xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent"
						>
							{m.messagingMessageDetails()}
						</h2>
					</div>
					<div
						class="flex items-center gap-2 px-4 py-2 rounded-full bg-base-200/80 border border-base-300/50"
					>
						<div class="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
						<span class="text-sm font-semibold text-base-content/70">{m.messageDraft()}</span>
					</div>
				</div>
			</div>

			<!-- Form Content -->
			<div class="p-8 space-y-8">
				<!-- Recipient -->
				<div class="form-control">
					<label class="label mb-2" for="recipient-select">
						<span class="label-text text-base font-bold flex items-center gap-2">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
								<i class="fa-solid fa-user text-violet-600"></i>
							</div>
							{m.messageRecipient()}
						</span>
					</label>
					<select
						id="recipient-select"
						class="select select-bordered select-lg w-full rounded-xl border-2 focus:border-violet-500 transition-all"
						bind:value={selectedRecipient}
						name="recipientId"
						required
					>
						<option value="">{m.messagingSelectRecipient()}</option>
						{#if loadError}
							<option disabled value="">{loadError}</option>
						{:else if recipients.length === 0}
							<option disabled value="">{m.messagingNoEligibleRecipients()}</option>
						{:else}
							{#each recipients as r}
								<option value={r.id}>{r.label}</option>
							{/each}
						{/if}
					</select>
					<div class="label">
						<span class="label-text-alt flex items-center gap-1 text-base-content/60">
							<i class="fa-solid fa-info-circle"></i>
							{m.messagingOnlyEnabledUsers()}
						</span>
					</div>
				</div>

				<!-- Divider -->
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t-2 border-base-300/50"></div>
					</div>
					<div class="relative flex justify-center">
						<span class="bg-base-100 px-4 text-sm text-base-content/50">
							<i class="fa-solid fa-grip-lines"></i>
						</span>
					</div>
				</div>

				<!-- Subject -->
				<div class="form-control">
					<label class="label mb-2" for="subject-input">
						<span class="label-text text-base font-bold flex items-center gap-2">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
								<i class="fa-solid fa-heading text-blue-600"></i>
							</div>
							{m.messageSubject()}
						</span>
						<span class="label-text-alt text-sm font-semibold">
							<span
								class={subjectCount > 180
									? 'text-orange-600 char-counter-warning'
									: 'text-base-content/60'}
							>
								{subjectCount}/200
							</span>
						</span>
					</label>
					<input
						id="subject-input"
						class="input input-bordered input-lg w-full rounded-xl border-2 focus:border-blue-500 transition-all"
						type="text"
						bind:value={subject}
						name="subject"
						maxlength="200"
						placeholder={m.messageSubjectPlaceholder()}
						required
					/>
				</div>

				<!-- Divider -->
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t-2 border-base-300/50"></div>
					</div>
					<div class="relative flex justify-center">
						<span class="bg-base-100 px-4 text-sm text-base-content/50">
							<i class="fa-solid fa-grip-lines"></i>
						</span>
					</div>
				</div>

				<!-- Message Body -->
				<div class="form-control">
					<label class="label mb-2" for="message-body">
						<span class="label-text text-base font-bold flex items-center gap-2">
							<div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
								<i class="fa-solid fa-message text-indigo-600"></i>
							</div>
							{m.messageMessageBody()}
						</span>
						<span class="label-text-alt text-sm font-semibold">
							<span
								class={bodyCount > 1800
									? 'text-orange-600 char-counter-warning'
									: 'text-base-content/60'}
							>
								{bodyCount}/2000
							</span>
						</span>
					</label>
					<textarea
						id="message-body"
						class="textarea textarea-bordered h-96 w-full resize-y text-base leading-relaxed rounded-xl border-2 focus:border-indigo-500 transition-all"
						bind:value={body}
						name="body"
						maxlength="2000"
						placeholder={m.messageMessagePlaceholder()}
						required
					></textarea>
					<div class="label">
						<span class="label-text-alt flex items-center gap-1 text-base-content/60">
							<i class="fa-solid fa-lightbulb"></i>
							{m.messagingTipSubjectLine()}
						</span>
					</div>
				</div>
			</div>

			<!-- Form Footer -->
			<div
				class="border-t-2 border-base-300/50 bg-gradient-to-r from-base-200/30 to-base-200/50 px-8 py-6"
			>
				<div class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-2 text-sm text-base-content/60">
						<i class="fa-solid fa-shield-check text-emerald-600"></i>
						<span>{m.messagingSavedInHistory()}</span>
					</div>
					<div class="flex gap-3">
						<a href={basePath} class="btn btn-lg btn-ghost gap-2 rounded-xl hover:bg-base-200">
							<i class="fa-solid fa-xmark"></i>
							{m.messageCancelButton()}
						</a>
						<button
							type="submit"
							class="btn btn-lg gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 border-0 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105"
						>
							<i class="fa-solid fa-paper-plane"></i>
							{m.messageSendButton()}
						</button>
					</div>
				</div>
			</div>
		</div>
	</form>
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

	.input:focus,
	.textarea:focus,
	.select:focus {
		outline: none;
		border-color: rgb(139 92 246);
		box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
	}

	.char-counter-warning {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
</style>
