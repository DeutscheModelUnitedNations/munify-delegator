<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	type Recipient = { id: string; label: string };
	type RecipientGroup = {
		groupId: string;
		groupLabel: string;
		category: string;
		recipients: Recipient[];
	};
	type ComposePageData = PageData & {
		recipientGroups?: RecipientGroup[];
		recipientLoadError?: string;
	};
	type ComposeActionData = { error?: string } | null | undefined;

	const { data, form }: { data: ComposePageData; form: ComposeActionData } = $props();

	let selectedGroupId = $state('');
	let selectedRecipient = $state('');
	let subject = $state('');
	let body = $state('');
	let prefilled = $state(false);

	const getActionError = (value: unknown) => {
		if (!value || typeof value !== 'object') return '';
		const maybeError = (value as { error?: unknown }).error;
		return typeof maybeError === 'string' ? maybeError : '';
	};

	const recipientGroups = $derived(data.recipientGroups ?? []);
	const loadError = $derived(data.recipientLoadError ?? '');
	const actionError = $derived(getActionError(form));

	const conferenceId = $derived(page.params.conferenceId);
	const basePath = $derived(`/dashboard/${conferenceId}/messaging`);
	const subjectCount = $derived(subject.length);
	const bodyCount = $derived(body.length);

	const userCanReceiveMail = $derived(
		data.conferenceQueryData?.findUniqueUser?.canReceiveDelegationMail
	);
	const showReceiveMailWarning = $derived(userCanReceiveMail === false);

	const selectedGroup = $derived(recipientGroups.find((g) => g.groupId === selectedGroupId));
	const groupRecipients = $derived(selectedGroup?.recipients ?? []);

	function handleGroupChange() {
		selectedRecipient = '';
	}

	// URL prefill
	$effect(() => {
		if (!prefilled && recipientGroups.length > 0) {
			const recipientIdParam = page.url.searchParams.get('recipientId');
			const subjectParam = page.url.searchParams.get('subject');
			if (recipientIdParam) {
				for (const group of recipientGroups) {
					if (group.recipients.some((r) => r.id === recipientIdParam)) {
						selectedGroupId = group.groupId;
						selectedRecipient = recipientIdParam;
						break;
					}
				}
			}
			if (subjectParam) subject = subjectParam;
			prefilled = true;
		}
	});

	const enhanceForm: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success(m.messageSent());
				selectedGroupId = '';
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

<div class="flex flex-col gap-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold">{m.messageComposeMessage()}</h1>
		<p class="text-base-content/70 mt-1">{m.messageSendToParticipants()}</p>
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
					{m.messagingNoReplyWarning()}
					<a href="/my-account" class="link font-bold">{m.messagingEnableInSettings()}</a>
				</p>
			</div>
		</div>
	{/if}

	<!-- Main Form -->
	<form method="POST" action="?/send" use:enhance={enhanceForm}>
		<div class="flex flex-col gap-6">
			<!-- Recipient Section -->
			<FormFieldset title={m.messageRecipient()}>
				<div class="form-control">
					<label class="label" for="group-select">
						<span class="label-text">{m.messagingSelectGroup()}</span>
					</label>
					<select
						id="group-select"
						class="select select-bordered w-full"
						bind:value={selectedGroupId}
						onchange={handleGroupChange}
					>
						<option value="">{m.messagingSelectGroup()}</option>
						{#if loadError}
							<option disabled value="">{loadError}</option>
						{:else if recipientGroups.length === 0}
							<option disabled value="">{m.messagingNoGroupsAvailable()}</option>
						{:else}
							{#each recipientGroups as group}
								<option value={group.groupId}>{group.groupLabel}</option>
							{/each}
						{/if}
					</select>
				</div>

				{#if selectedGroupId}
					<div class="form-control">
						<label class="label" for="recipient-select">
							<span class="label-text">{m.messagingSelectRecipient()}</span>
						</label>
						<select
							id="recipient-select"
							class="select select-bordered w-full"
							bind:value={selectedRecipient}
							name="recipientId"
							required
						>
							<option value="">{m.messagingSelectRecipient()}</option>
							{#if groupRecipients.length === 0}
								<option disabled value="">{m.messagingNoRecipientsInGroup()}</option>
							{:else}
								{#each groupRecipients as r}
									<option value={r.id}>{r.label}</option>
								{/each}
							{/if}
						</select>
						<label class="label" for="recipient-select">
							<span class="label-text-alt text-base-content/60">
								<i class="fa-duotone fa-info-circle"></i>
								{m.messagingOnlyEnabledUsers()}
							</span>
						</label>
					</div>
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
						placeholder={m.messageMessagePlaceholder()}
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
						{m.messageSendButton()}
					</button>
				</div>
			</div>
		</div>
	</form>
</div>
