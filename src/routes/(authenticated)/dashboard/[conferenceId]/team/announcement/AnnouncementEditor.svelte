<!--
	@component
	Writes or changes one announcement: its text with a preview as readers get it, how loud it is,
	who it is for, its files, until when it shows and whether a mail goes out. Saving keeps it as
	it is (a new one as a draft); publishing is the list's.
-->
<script lang="ts">
	import { errorToastMessage } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { uploadFile } from '#lib/api/uploadFile';
	import Modal from '#lib/components/Modal.svelte';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import AnnouncementCard from '#lib/components/announcement/AnnouncementCard.svelte';
	import { dateToDatetimeLocal } from '#lib/helpers/conferenceTimezoneDate';
	import {
		announcementTextSchema,
		MAX_ANNOUNCEMENT_ATTACHMENTS,
		MAX_ANNOUNCEMENT_BODY,
		MAX_ANNOUNCEMENT_SIGNATURE,
		MAX_ANNOUNCEMENT_TITLE,
		type AnnouncementImportance,
		type Audience
	} from '#lib/helpers/announcements';
	import AudiencePicker from './AudiencePicker.svelte';
	import AttachmentPicker from './AttachmentPicker.svelte';
	import type { AudienceLookups } from './announcementLabels';
	import type { AnnouncementRow } from './announcementRows';
	import { announcementValues } from './announcementForm';

	interface Props {
		open: boolean;
		conferenceId: string;
		timezone: string;
		lookups: AudienceLookups;
		/** The announcement to change; a new one without. */
		announcement?: AnnouncementRow;
	}

	let { open = $bindable(), conferenceId, timezone, lookups, announcement }: Props = $props();

	// Seeded once and then owned by the form: an update to the row must not overwrite what is typed.
	const seed = untrack(() => announcement);
	let title = $state(seed?.title ?? '');
	let body = $state(seed?.body ?? '');
	let signature = $state(seed?.signature ?? '');
	let importance = $state<AnnouncementImportance>(seed?.importance ?? 'NORMAL');
	let pinned = $state(seed?.pinned ?? false);
	let notifyByMail = $state(seed?.notifyByMail ?? false);
	let mailIncludesText = $state(seed?.mailIncludesText ?? true);
	let visibleUntil = $state(
		seed?.visibleUntil
			? dateToDatetimeLocal({
					date: new Date(seed.visibleUntil),
					timezone: untrack(() => timezone)
				})
			: ''
	);
	let audiences = $state<Audience[]>(
		(seed?.audiences ?? []).map((audience) => ({
			kind: audience.kind,
			committeeId: audience.committeeId,
			roleId: audience.roleId,
			surveyOptionId: audience.surveyOptionId,
			teamRole: audience.teamRole
		}))
	);
	/** The files it keeps, and the ones picked to be uploaded with the next save. */
	let kept = $state(
		(seed?.attachments ?? [])
			.toSorted((a, b) => a.position - b.position)
			.map(({ file }) => ({ id: file.id, fileName: file.fileName, url: file.url }))
	);
	let added = $state<File[]>([]);
	let saving = $state(false);
	const savedMessage = seed ? m.saved() : m.announcementSavedAsDraft();
	const fieldId = $props.id();

	/** The importances in rising order, coloured as the card shows them. */
	const IMPORTANCES: readonly {
		value: AnnouncementImportance;
		label: () => string;
		icon: string;
		tone: string;
	}[] = [
		{
			value: 'NORMAL',
			label: m.announcementImportanceNormal,
			icon: 'ph-megaphone',
			tone: 'btn-info'
		},
		{
			value: 'IMPORTANT',
			label: m.announcementImportanceImportant,
			icon: 'ph-warning-circle',
			tone: 'btn-warning'
		},
		{ value: 'URGENT', label: m.announcementImportanceUrgent, icon: 'ph-siren', tone: 'btn-error' }
	];

	const titleError = $derived(announcementTextSchema.title.safeParse(title).error?.issues[0]);
	const bodyError = $derived(announcementTextSchema.body.safeParse(body).error?.issues[0]);
	const tooManyFiles = $derived(kept.length + added.length > MAX_ANNOUNCEMENT_ATTACHMENTS);
	const valid = $derived(!titleError && !bodyError && audiences.length > 0 && !tooManyFiles);
	/** Whether anything was typed yet, so an untouched form shows no errors. */
	let touched = $state(false);

	/** Creates the announcement as a draft, or changes the one being edited. */
	function store(values: ReturnType<typeof announcementValues>) {
		return seed
			? client.mutate.updateAnnouncement({ __args: { id: seed.id, ...values }, id: true })
			: client.mutate.createAnnouncement({ __args: { conferenceId, ...values }, id: true });
	}

	async function save() {
		touched = true;
		if (!valid) return;
		saving = true;
		try {
			const uploadedFileIds = await Promise.all(
				added.map((file) =>
					uploadFile({ file, target: { kind: 'announcement', field: 'attachment', conferenceId } })
				)
			);
			const promise = store(
				announcementValues({
					form: {
						title,
						body,
						signature,
						importance,
						pinned,
						notifyByMail,
						mailIncludesText,
						visibleUntil,
						audiences
					},
					timezone,
					keptFileIds: kept.map((file) => file.id),
					uploadedFileIds
				})
			);
			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: savedMessage,
				error: errorToastMessage
			});
			await promise;
			open = false;
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open fullWidth title={seed ? m.announcementEditTitle() : m.announcementNewTitle()}>
	<div class="flex flex-col gap-6" data-testid="announcement-editor">
		<!-- what it says beside how it reads; who gets it and how loud below -->
		<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
			<FormFieldset plain title={m.announcementText()}>
				{#snippet icon()}<i aria-hidden="true" class="ph-duotone ph-text-aa text-sm"></i>{/snippet}
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-medium">{m.announcementTitleLabel()}</span>
					<input
						class="input w-full font-semibold"
						maxlength={MAX_ANNOUNCEMENT_TITLE}
						aria-invalid={touched && !!titleError}
						bind:value={title}
						oninput={() => (touched = true)}
						data-testid="announcement-title"
					/>
					{#if touched && titleError}
						<span class="text-error text-sm">{titleError.message}</span>
					{/if}
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-medium">{m.announcementBodyLabel()}</span>
					<textarea
						class="textarea h-64 w-full leading-relaxed"
						maxlength={MAX_ANNOUNCEMENT_BODY}
						aria-invalid={touched && !!bodyError}
						placeholder={m.markdownSupportedPlaceholder()}
						bind:value={body}
						oninput={() => (touched = true)}
						data-testid="announcement-body"></textarea>
					{#if touched && bodyError}
						<span class="text-error text-sm">{bodyError.message}</span>
					{/if}
					<span class="text-base-content/60 flex items-center gap-1.5 text-xs">
						<i aria-hidden="true" class="ph-duotone ph-markdown-logo text-sm"></i>
						{m.announcementMarkdownHint()}
					</span>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-medium">{m.announcementSignatureLabel()}</span>
					<input
						class="input w-full"
						maxlength={MAX_ANNOUNCEMENT_SIGNATURE}
						placeholder={m.announcementSignaturePlaceholder()}
						bind:value={signature}
						data-testid="announcement-signature"
					/>
				</label>
				<AttachmentPicker bind:kept bind:added />
			</FormFieldset>

			<!-- stays in sight while the text beside it grows -->
			<section class="flex min-w-0 flex-col gap-3 self-start xl:sticky xl:top-0">
				<h3
					class="text-base-content/60 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
				>
					<i aria-hidden="true" class="ph-duotone ph-eye text-sm"></i>
					{m.preview()}
				</h3>
				<AnnouncementCard
					title={title || m.announcementTitleLabel()}
					{body}
					{importance}
					{pinned}
					signature={signature.trim() || null}
					attachments={kept}
					expanded
				/>
			</section>
		</div>

		<div class="border-base-content/10 grid grid-cols-1 gap-6 border-t pt-6 xl:grid-cols-2">
			<FormFieldset plain title={m.announcementAudience()}>
				{#snippet icon()}<i aria-hidden="true" class="ph-duotone ph-users-three text-sm"
					></i>{/snippet}
				<AudiencePicker {conferenceId} bind:audiences {lookups} />
			</FormFieldset>

			<FormFieldset plain title={m.announcementOptions()}>
				{#snippet icon()}<i aria-hidden="true" class="ph-duotone ph-sliders-horizontal text-sm"
					></i>{/snippet}
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-medium" id="{fieldId}-importance">
						{m.announcementImportance()}
					</span>
					<div
						class="join w-full"
						role="radiogroup"
						aria-labelledby="{fieldId}-importance"
						data-testid="announcement-importance"
					>
						{#each IMPORTANCES as option (option.value)}
							<label
								class={[
									'join-item btn btn-sm has-focus-visible:outline-base-content flex-1 gap-1.5 has-focus-visible:outline-2',
									importance === option.value ? option.tone : 'btn-soft'
								]}
							>
								<input
									type="radio"
									class="sr-only"
									name="{fieldId}-importance"
									value={option.value}
									bind:group={importance}
								/>
								<i aria-hidden="true" class="ph-duotone {option.icon}"></i>
								{option.label()}
							</label>
						{/each}
					</div>
					<span class="text-base-content/60 text-xs">{m.announcementImportanceHint()}</span>
				</div>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						class="toggle toggle-primary toggle-sm mt-0.5 shrink-0"
						bind:checked={pinned}
					/>
					<span class="flex flex-col gap-0.5">
						<span class="text-sm font-medium">{m.announcementPinLabel()}</span>
						<span class="text-base-content/60 text-xs">{m.announcementPinHint()}</span>
					</span>
				</label>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						class="toggle toggle-primary toggle-sm mt-0.5 shrink-0"
						bind:checked={notifyByMail}
						data-testid="announcement-notify"
					/>
					<span class="flex flex-col gap-0.5">
						<span class="text-sm font-medium">{m.announcementNotifyLabel()}</span>
						<span class="text-base-content/60 text-xs">{m.announcementNotifyHint()}</span>
					</span>
				</label>
				{#if notifyByMail}
					<label class="ms-8 flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm mt-0.5 shrink-0"
							bind:checked={mailIncludesText}
							data-testid="announcement-mail-text"
						/>
						<span class="flex flex-col gap-0.5">
							<span class="text-sm font-medium">{m.announcementMailTextLabel()}</span>
							<span class="text-base-content/60 text-xs">{m.announcementMailTextHint()}</span>
						</span>
					</label>
				{/if}
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-medium">{m.announcementVisibleUntil()}</span>
					<input type="datetime-local" class="input w-full" bind:value={visibleUntil} />
					<span class="text-base-content/60 text-xs">
						{m.announcementVisibleUntilHint()}
						{m.announcementTimezoneHint({ timezone })}
					</span>
				</label>
			</FormFieldset>
		</div>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			disabled={saving || (touched && !valid)}
			onclick={save}
			data-testid="announcement-save"
		>
			{#if saving}
				<i aria-hidden="true" class="ph-duotone ph-spinner-gap animate-spin"></i>
			{:else}
				<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
			{/if}
			{seed ? m.save() : m.announcementSaveDraft()}
		</button>
	{/snippet}
</Modal>
