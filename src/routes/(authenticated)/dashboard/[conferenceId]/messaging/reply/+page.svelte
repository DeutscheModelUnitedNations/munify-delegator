<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	type Recipient = { id: string; label: string };
	type ReplyPageData = PageData & {
		recipient: Recipient;
		prefilledSubject: string;
	};
	type ReplyActionData = { error?: string } | null | undefined;

	const { data, form }: { data: ReplyPageData; form: ReplyActionData } = $props();

	const initialSubject = data.prefilledSubject;
	let subject = $state(initialSubject);
	let body = $state('');

	const getActionError = (value: unknown) => {
		if (!value || typeof value !== 'object') return '';
		const maybeError = (value as { error?: unknown }).error;
		return typeof maybeError === 'string' ? maybeError : '';
	};

	const recipient = $derived(data.recipient);
	const actionError = $derived(getActionError(form));

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const subjectCount = $derived(subject.length);
	const bodyCount = $derived(body.length);

	const userCanReceiveMail = $derived(
		data.conferenceQueryData?.findUniqueUser?.canReceiveDelegationMail
	);
	const showReceiveMailWarning = $derived(userCanReceiveMail === false);

	const enhanceForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success(m.messagingReplySent());
				body = '';
			} else if (result.type === 'failure') {
				const errorMessage = getActionError(result.data);
				if (errorMessage === 'Recipient has not enabled messaging.') {
					toast.error(m.messagingRecipientNotEnabledToast());
				}
			}
			await update();
		};
	};
</script>

<div class="flex flex-col gap-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold">{m.messagingReplyToMessage()}</h1>
		<p class="text-base-content/70 mt-1">
			{m.messagingRespondingTo({ recipientName: recipient.label })}
		</p>
	</div>

	<!-- Alerts -->
	{#if actionError}
		<div role="alert" class="alert alert-error">
			<i class="fa-duotone fa-circle-exclamation"></i>
			<span>{actionError}</span>
		</div>
	{/if}

	{#if showReceiveMailWarning}
		<div role="alert" class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation"></i>
			<div>
				<span class="font-semibold">{m.messagingDisabledForAccount()}</span>
				<p class="text-sm">
					{m.messagingCannotReceiveReplies()}
					<a href="/my-account" class="link font-bold">{m.messagingEnableInSettings()}</a>
				</p>
			</div>
		</div>
	{/if}

	<!-- Main Form -->
	<form method="POST" action="?/send" use:enhance={enhanceForm}>
		<input type="hidden" name="recipientId" value={recipient.id} />
		<div class="flex flex-col gap-6">
			<!-- Recipient Section -->
			<FormFieldset title={m.messageRecipient()}>
				<div class="form-control">
					<label class="label" for="reply-recipient">
						<span class="label-text">{m.messagingTo()}</span>
					</label>
					<div
						id="reply-recipient"
						class="input input-bordered flex items-center gap-2 bg-base-200/50"
					>
						<i class="fa-duotone fa-user text-base-content/50"></i>
						<span class="font-semibold">{recipient.label}</span>
					</div>
				</div>
			</FormFieldset>

			<!-- Message Content Section -->
			<FormFieldset title={m.messagingMessageDetails()}>
				<div class="form-control">
					<label class="label" for="reply-subject">
						<span class="label-text">{m.messageSubject()}</span>
						<span class="label-text-alt" class:text-warning={subjectCount > 180}>
							{subjectCount}/200
						</span>
					</label>
					<input
						id="reply-subject"
						class="input input-bordered w-full"
						type="text"
						bind:value={subject}
						name="subject"
						maxlength="200"
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="reply-body">
						<span class="label-text">{m.messageMessageBody()}</span>
						<span class="label-text-alt" class:text-warning={bodyCount > 1800}>
							{bodyCount}/2000
						</span>
					</label>
					<textarea
						id="reply-body"
						class="textarea textarea-bordered h-64 w-full resize-y"
						bind:value={body}
						name="body"
						maxlength="2000"
						placeholder={m.messagingWriteReplyPlaceholder()}
						required
					></textarea>
				</div>
			</FormFieldset>

			<!-- Form Footer -->
			<div class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
				<span class="text-sm text-base-content/60">
					<i class="fa-duotone fa-shield-check text-success"></i>
					{m.messagingSavedInHistory()}
				</span>
				<div class="flex gap-3">
					<a href={basePath} class="btn btn-ghost">
						<i class="fa-duotone fa-xmark"></i>
						{m.messageCancelButton()}
					</a>
					<button type="submit" class="btn btn-primary">
						<i class="fa-solid fa-paper-plane"></i>
						{m.messagingSendReply()}
					</button>
				</div>
			</div>
		</div>
	</form>
</div>
