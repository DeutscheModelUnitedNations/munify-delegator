<script lang="ts">
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
				toast.success('Message sent.');
				selectedRecipient = '';
				subject = '';
				body = '';
			} else if (result.type === 'failure') {
				const errorMessage = getActionError(result.data);
				if (errorMessage === 'Recipient has not enabled messaging.') {
					toast.error('Recipient has not enabled messaging.');
				}
			}
			await update();
		};
	};
</script>

<div class="mx-auto max-w-5xl space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
					<i class="fa-solid fa-pen-to-square text-lg text-primary"></i>
				</div>
				<div>
					<h1 class="text-2xl font-bold">Compose Message</h1>
					<p class="text-sm text-base-content/60">Send a message to conference participants</p>
				</div>
			</div>
		</div>
		<nav class="tabs tabs-boxed bg-base-200">
			<a class="tab" href={basePath}>Overview</a>
			<a class="tab tab-active" href={`${basePath}/compose`} aria-current="page">Compose</a>
			<a class="tab" href={`${basePath}/history`}>History</a>
		</nav>
	</div>

	<!-- Alerts -->
	{#if actionError}
		<div class="alert alert-error shadow-lg">
			<i class="fa-solid fa-circle-exclamation text-xl"></i>
			<span class="font-medium">{actionError}</span>
		</div>
	{/if}

	{#if showReceiveMailWarning}
		<div class="alert alert-warning shadow-lg">
			<i class="fa-solid fa-triangle-exclamation text-xl"></i>
			<div>
				<span class="font-medium">Messaging is disabled for your account.</span>
				<p class="text-sm opacity-80">
					You cannot receive replies. <a href="/my-account" class="link font-semibold"
						>Enable it in settings</a
					>
				</p>
			</div>
		</div>
	{/if}

	<!-- Quick Tips Banner -->
	<div class="rounded-lg border border-base-300 bg-base-200/50 p-4">
		<div class="flex flex-wrap items-start gap-6 text-sm">
			<div class="flex items-center gap-2">
				<i class="fa-solid fa-circle-check text-success"></i>
				<span class="text-base-content/70">Verify recipient and conference</span>
			</div>
			<div class="flex items-center gap-2">
				<i class="fa-solid fa-circle-check text-success"></i>
				<span class="text-base-content/70">Include deadlines when applicable</span>
			</div>
			<div class="flex items-center gap-2">
				<i class="fa-solid fa-circle-check text-success"></i>
				<span class="text-base-content/70">Keep it concise and actionable</span>
			</div>
		</div>
	</div>

	<!-- Main Form -->
	<form method="POST" action="?/send" use:enhance={enhanceForm} class="space-y-6">
		<div class="rounded-xl border border-base-300 bg-base-100 shadow-lg">
			<!-- Form Header -->
			<div class="border-b border-base-300 bg-base-200/50 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Message Details</h2>
					<div class="badge badge-neutral gap-2">
						<i class="fa-solid fa-circle-dot text-xs"></i>
						Draft
					</div>
				</div>
			</div>

			<!-- Form Content -->
			<div class="space-y-6 p-6 sm:p-8">
				<!-- Recipient -->
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">
							<i class="fa-solid fa-user mr-2 text-primary"></i>
							Recipient
						</span>
					</label>
					<select
						class="select select-bordered select-lg w-full"
						bind:value={selectedRecipient}
						name="recipientId"
						required
					>
						<option value="">Select a recipient...</option>
						{#if loadError}
							<option disabled value="">{loadError}</option>
						{:else if recipients.length === 0}
							<option disabled value="">No eligible recipients found</option>
						{:else}
							{#each recipients as r}
								<option value={r.id}>{r.label}</option>
							{/each}
						{/if}
					</select>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							<i class="fa-solid fa-info-circle mr-1"></i>
							Only users who have enabled messaging will appear in this list
						</span>
					</label>
				</div>

				<div class="divider"></div>

				<!-- Subject -->
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">
							<i class="fa-solid fa-heading mr-2 text-primary"></i>
							Subject
						</span>
						<span class="label-text-alt">
							<span
								class={subjectCount > 180 ? 'text-warning font-semibold' : 'text-base-content/60'}
							>
								{subjectCount}/200
							</span>
						</span>
					</label>
					<input
						class="input input-bordered input-lg w-full"
						type="text"
						bind:value={subject}
						name="subject"
						maxlength="200"
						placeholder="e.g., Committee agenda lock - 18:00 CET"
						required
					/>
				</div>

				<div class="divider"></div>

				<!-- Message Body -->
				<div class="form-control">
					<label class="label">
						<span class="label-text font-semibold">
							<i class="fa-solid fa-message mr-2 text-primary"></i>
							Message
						</span>
						<span class="label-text-alt">
							<span
								class={bodyCount > 1800 ? 'text-warning font-semibold' : 'text-base-content/60'}
							>
								{bodyCount}/2000
							</span>
						</span>
					</label>
					<textarea
						class="textarea textarea-bordered h-80 w-full resize-y text-base leading-relaxed"
						bind:value={body}
						name="body"
						maxlength="2000"
						placeholder="Share key details, action items, and deadlines here...&#10;&#10;Keep it clear and concise. You can include links for additional information."
						required
					></textarea>
					<label class="label">
						<span class="label-text-alt text-base-content/60">
							<i class="fa-solid fa-lightbulb mr-1"></i>
							Tip: Use clear subject lines like "Committee agenda lock - 18:00" to improve response rates
						</span>
					</label>
				</div>
			</div>

			<!-- Form Footer -->
			<div class="border-t border-base-300 bg-base-200/30 px-6 py-5 sm:px-8">
				<div class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
					<p class="flex items-center gap-2 text-sm text-base-content/60">
						<i class="fa-solid fa-clock-rotate-left"></i>
						This message will be saved in delivery history
					</p>
					<div class="flex gap-3">
						<a href={basePath} class="btn btn-ghost btn-lg gap-2">
							<i class="fa-solid fa-xmark"></i>
							Cancel
						</a>
						<button type="submit" class="btn btn-primary btn-lg gap-2">
							<i class="fa-solid fa-paper-plane"></i>
							Send Message
						</button>
					</div>
				</div>
			</div>
		</div>
	</form>
</div>
