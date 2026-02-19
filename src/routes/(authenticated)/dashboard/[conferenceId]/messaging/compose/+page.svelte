<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import type { PageData, ActionData, SubmitFunction } from './$types';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import RecipientPickerDrawer from '$lib/components/Messaging/RecipientPickerDrawer.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import {
		getRecipientDisplayName,
		type Recipient
	} from '$lib/components/Messaging/recipientUtils';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	let subject = $state('');
	let body = $state('');
	let prefilled = $state(false);
	let selectedRecipientObj = $state<Recipient | null>(null);

	const getActionError = (value: unknown) => {
		if (!value || typeof value !== 'object') return '';
		const maybeError = (value as { error?: unknown }).error;
		return typeof maybeError === 'string' ? maybeError : '';
	};

	const recipientGroups = $derived(data.recipientGroups ?? []);
	const loadError = $derived(data.recipientLoadError ?? '');
	const actionError = $derived(getActionError(form));
	const replyToMessage = $derived(data.replyToMessage ?? null);
	const isReplyMode = $derived(replyToMessage !== null);

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const subjectCount = $derived(subject.length);
	const bodyCount = $derived(body.length);

	const canReceiveMail = $derived(
		data.conferenceQueryData?.findUniqueUser?.canReceiveDelegationMail ?? false
	);

	let togglingMessaging = $state(false);
	let toggleFormEl: HTMLFormElement | undefined = $state();

	// URL prefill
	$effect(() => {
		if (!prefilled && recipientGroups.length > 0) {
			if (replyToMessage) {
				// Reply mode: find sender in recipient groups and lock recipient
				for (const group of recipientGroups) {
					const found = group.recipients.find((r) => r.id === replyToMessage.senderUserId);
					if (found) {
						selectedRecipientObj = found;
						break;
					}
				}
				// Prefill subject with Re: dedup
				const originalSubject = replyToMessage.subject;
				subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
			} else {
				// Normal compose mode: check URL params
				const recipientIdParam = page.url.searchParams.get('recipientId');
				const subjectParam = page.url.searchParams.get('subject');
				if (recipientIdParam) {
					for (const group of recipientGroups) {
						const found = group.recipients.find((r) => r.id === recipientIdParam);
						if (found) {
							selectedRecipientObj = found;
							break;
						}
					}
				}
				if (subjectParam) subject = subjectParam;
			}
			prefilled = true;
		}
	});

	const recipientDisplayName = $derived(
		selectedRecipientObj ? getRecipientDisplayName(selectedRecipientObj) : ''
	);

	const enhanceForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success(isReplyMode ? m.messagingReplySent() : m.messageSent());
				if (!isReplyMode) {
					selectedRecipientObj = null;
					subject = '';
				}
				body = '';
			} else if (result.type === 'failure') {
				const errorMessage = getActionError(result.data);
				if (errorMessage === 'Recipient has not enabled messaging.') {
					toast.error(m.messageRecipientNotEnabled());
				} else if (errorMessage === 'You must enable messaging in your account settings.') {
					toast.error(m.messagingSenderNotEnabled());
				}
			}
			await update();
		};
	};

	const formattedSentAt = $derived(
		replyToMessage
			? new Date(replyToMessage.sentAt).toLocaleString(undefined, {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			: ''
	);
</script>

<div class="flex flex-col gap-6 w-full max-w-5xl">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold">
			{isReplyMode ? m.messagingReplyToMessage() : m.messageComposeMessage()}
		</h1>
		<p class="text-base-content/70 mt-1">
			{#if isReplyMode && selectedRecipientObj}
				{m.messagingRespondingTo({ recipientName: recipientDisplayName })}
			{:else}
				{m.messageSendToParticipants()}
			{/if}
		</p>
	</div>

	<!-- Alerts -->
	{#if actionError}
		<div role="alert" class="alert alert-error">
			<i class="fa-duotone fa-circle-exclamation"></i>
			<span>{actionError}</span>
		</div>
	{/if}

	<form
		class="w-full"
		bind:this={toggleFormEl}
		method="POST"
		action="?/toggleMessaging"
		use:enhance={() => {
			togglingMessaging = true;
			return async ({ update }) => {
				await update();
				await invalidateAll();
				togglingMessaging = false;
			};
		}}
	>
		<input type="hidden" name="enabled" value={String(!canReceiveMail)} />
		{#if !canReceiveMail}
			<div role="alert" class="alert {canReceiveMail ? 'alert-success' : 'alert-warning'}">
				<i class="fa-solid {canReceiveMail ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg"
				></i>
				<span class="flex-1"
					>{canReceiveMail ? m.messagingToggleEnabled() : m.messagingToggleDisabled()}</span
				>
				<input
					type="checkbox"
					class="toggle {canReceiveMail ? 'toggle-success' : ''}"
					class:opacity-50={togglingMessaging}
					checked={canReceiveMail}
					disabled={togglingMessaging}
					aria-label={canReceiveMail ? m.messagingToggleEnabled() : m.messagingToggleDisabled()}
					onchange={() => toggleFormEl?.requestSubmit()}
				/>
			</div>
		{/if}
	</form>

	<!-- Main Form -->
	<form method="POST" action="?/send" use:enhance={enhanceForm}>
		<input type="hidden" name="recipientId" value={selectedRecipientObj?.id ?? ''} />
		<input type="hidden" name="replyToMessageId" value={replyToMessage?.id ?? ''} />
		<div class="flex flex-col gap-6">
			<!-- Recipient Section -->
			<FormFieldset title={m.messageRecipient()}>
				{#if isReplyMode && selectedRecipientObj}
					<!-- Locked recipient display for reply mode -->
					<div class="form-control">
						<label class="label" for="reply-recipient">
							<span class="label-text">{m.messagingTo()}</span>
						</label>
						<div
							id="reply-recipient"
							class="input input-bordered flex items-center gap-2.5 bg-base-200/50"
						>
							{#if selectedRecipientObj.alpha2Code}
								<Flag size="xs" alpha2Code={selectedRecipientObj.alpha2Code.toLowerCase()} />
							{:else if selectedRecipientObj.fontAwesomeIcon}
								<Flag size="xs" nsa icon={selectedRecipientObj.fontAwesomeIcon} />
							{:else}
								<i class="fa-duotone fa-user text-base-content/50"></i>
							{/if}
							<div class="min-w-0 flex-1 flex items-center gap-2">
								<span class="font-semibold truncate">{recipientDisplayName}</span>
								{#if selectedRecipientObj.firstName && selectedRecipientObj.lastName}
									<span class="text-sm text-base-content/50 truncate">
										{selectedRecipientObj.firstName}
										{selectedRecipientObj.lastName}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- Normal recipient picker for compose mode -->
					<RecipientPickerDrawer
						groups={recipientGroups}
						bind:selected={selectedRecipientObj}
						{loadError}
					/>
					{#if !selectedRecipientObj}
						<span class="text-xs text-base-content/60">
							<i class="fa-duotone fa-info-circle"></i>
							{m.messagingOnlyEnabledUsers()}
						</span>
					{/if}
				{/if}
			</FormFieldset>

			<!-- Message Content Section -->
			<FormFieldset title={m.messagingMessageDetails()}>
				<div class="form-control">
					<label class="label" for="subject-input">
						<span class="label-text">{m.messageSubject()}</span>
						<span class="label-text-alt" class:text-warning={subjectCount > 180}>
							{subjectCount}/200
						</span>
					</label>
					<input
						id="subject-input"
						class="input input-bordered w-full"
						type="text"
						bind:value={subject}
						name="subject"
						maxlength="200"
						placeholder={m.messageSubjectPlaceholder()}
						required
					/>
				</div>

				<div class="form-control">
					<label class="label" for="message-body">
						<span class="label-text">{m.messageMessageBody()}</span>
						<span class="label-text-alt" class:text-warning={bodyCount > 1800}>
							{bodyCount}/2000
						</span>
					</label>
					<textarea
						id="message-body"
						class="textarea textarea-bordered h-64 w-full resize-y"
						bind:value={body}
						name="body"
						maxlength="2000"
						placeholder={isReplyMode
							? m.messagingWriteReplyPlaceholder()
							: m.messageMessagePlaceholder()}
						required
					></textarea>
				</div>
			</FormFieldset>

			<!-- Original Message Display (reply mode only) -->
			{#if replyToMessage}
				<FormFieldset title={m.messagingOriginalMessage()}>
					<div class="flex flex-col gap-2">
						<div class="text-sm text-base-content/60">
							<span class="font-medium">{replyToMessage.senderLabel}</span>
							<span class="mx-1">&middot;</span>
							<span>{formattedSentAt}</span>
						</div>
						<div class="text-sm font-medium text-base-content/70">
							{replyToMessage.subject}
						</div>
						<div
							class="border-l-2 border-base-300 pl-3 text-sm text-base-content/60 whitespace-pre-line"
						>
							{replyToMessage.body}
						</div>
					</div>
				</FormFieldset>
			{/if}

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
					<button type="submit" class="btn btn-primary" disabled={!selectedRecipientObj}>
						<i class="fa-solid fa-paper-plane"></i>
						{isReplyMode ? m.messagingSendReply() : m.messageSendButton()}
					</button>
				</div>
			</div>
		</div>
	</form>
</div>
