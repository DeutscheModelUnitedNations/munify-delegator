<!--
	@component
	Writes or changes one announcement: its text with a preview as readers get it, how loud it is,
	who it is for, its files, until when it shows and whether a mail goes out. Saving keeps it as
	it is (a new one as a draft); publishing is the list's.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { uploadFile } from '#lib/api/uploadFile';
	import Modal from '#lib/components/Modal.svelte';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import AnnouncementCard from '#lib/components/announcement/AnnouncementCard.svelte';
	import { dateToDatetimeLocal, datetimeLocalToDate } from '#lib/helpers/conferenceTimezoneDate';
	import {
		announcementTextSchema,
		audienceInput,
		MAX_ANNOUNCEMENT_ATTACHMENTS,
		MAX_ANNOUNCEMENT_BODY,
		MAX_ANNOUNCEMENT_SIGNATURE,
		MAX_ANNOUNCEMENT_TITLE,
		type AnnouncementImportance,
		type Audience
	} from '#lib/helpers/announcements';
	import AudiencePicker from './AudiencePicker.svelte';
	import type { AudienceLookups } from './announcementLabels';
	import type { AnnouncementRow } from './announcementRows';

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

	const titleError = $derived(announcementTextSchema.title.safeParse(title).error?.issues[0]);
	const bodyError = $derived(announcementTextSchema.body.safeParse(body).error?.issues[0]);
	const tooManyFiles = $derived(kept.length + added.length > MAX_ANNOUNCEMENT_ATTACHMENTS);
	const valid = $derived(!titleError && !bodyError && audiences.length > 0 && !tooManyFiles);
	/** Whether anything was typed yet, so an untouched form shows no errors. */
	let touched = $state(false);

	function pickFiles(event: Event & { currentTarget: HTMLInputElement }) {
		added = [...added, ...(event.currentTarget.files ?? [])];
		event.currentTarget.value = '';
	}

	async function save() {
		touched = true;
		if (!valid) return;
		saving = true;
		try {
			const uploaded = await Promise.all(
				added.map((file) =>
					uploadFile({ file, target: { kind: 'announcement', field: 'attachment', conferenceId } })
				)
			);
			const values = {
				title,
				body,
				signature: signature.trim() || null,
				importance,
				pinned,
				notifyByMail,
				visibleUntil: visibleUntil
					? datetimeLocalToDate({ datetimeLocal: visibleUntil, timezone })
					: null,
				audiences: audiences.map(audienceInput),
				attachmentFileIds: [
					...kept.map((file) => file.id),
					...uploaded.flatMap((id) => (id ? [id] : []))
				]
			};
			const promise = seed
				? client.mutate.updateAnnouncement({ __args: { id: seed.id, ...values }, id: true })
				: client.mutate.createAnnouncement({ __args: { conferenceId, ...values }, id: true });
			toast.promise(promise, {
				loading: m.genericToastLoading(),
				success: seed ? m.saved() : m.announcementSavedAsDraft(),
				error: (error) => (error instanceof Error ? error.message : m.genericToastError())
			});
			await promise;
			open = false;
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open fullWidth title={seed ? m.announcementEditTitle() : m.announcementNewTitle()}>
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-2" data-testid="announcement-editor">
		<div class="flex min-w-0 flex-col gap-4">
			<FormFieldset title={m.announcementText()}>
				<label class="flex flex-col gap-1">
					<span class="label-text">{m.announcementTitleLabel()}</span>
					<input
						class="input w-full"
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
				<label class="mt-3 flex flex-col gap-1">
					<span class="label-text">{m.announcementBodyLabel()}</span>
					<textarea
						class="textarea h-56 w-full font-mono text-sm"
						maxlength={MAX_ANNOUNCEMENT_BODY}
						aria-invalid={touched && !!bodyError}
						placeholder={m.markdownSupportedPlaceholder()}
						bind:value={body}
						oninput={() => (touched = true)}
						data-testid="announcement-body"></textarea>
					{#if touched && bodyError}
						<span class="text-error text-sm">{bodyError.message}</span>
					{/if}
					<span class="text-base-content/60 text-xs">{m.announcementMarkdownHint()}</span>
				</label>
				<label class="mt-3 flex flex-col gap-1">
					<span class="label-text">{m.announcementSignatureLabel()}</span>
					<input
						class="input w-full"
						maxlength={MAX_ANNOUNCEMENT_SIGNATURE}
						placeholder={m.announcementSignaturePlaceholder()}
						bind:value={signature}
						data-testid="announcement-signature"
					/>
				</label>
			</FormFieldset>

			<FormFieldset title={m.announcementAudience()}>
				<AudiencePicker {conferenceId} bind:audiences {lookups} />
			</FormFieldset>

			<FormFieldset title={m.announcementOptions()}>
				<label class="flex flex-col gap-1">
					<span class="label-text">{m.announcementImportance()}</span>
					<select
						class="select w-full"
						bind:value={importance}
						data-testid="announcement-importance"
					>
						<option value="NORMAL">{m.announcementImportanceNormal()}</option>
						<option value="IMPORTANT">{m.announcementImportanceImportant()}</option>
						<option value="URGENT">{m.announcementImportanceUrgent()}</option>
					</select>
					<span class="text-base-content/60 text-xs">{m.announcementImportanceHint()}</span>
				</label>
				<label class="label mt-3 cursor-pointer justify-start gap-3 whitespace-normal">
					<input type="checkbox" class="toggle toggle-primary shrink-0" bind:checked={pinned} />
					<span>{m.announcementPinLabel()}</span>
				</label>
				<label class="label mt-2 cursor-pointer justify-start gap-3 whitespace-normal">
					<input
						type="checkbox"
						class="toggle toggle-primary shrink-0"
						bind:checked={notifyByMail}
						data-testid="announcement-notify"
					/>
					<span>{m.announcementNotifyLabel()}</span>
				</label>
				<p class="text-base-content/60 text-xs">{m.announcementNotifyHint()}</p>
				<label class="mt-3 flex flex-col gap-1">
					<span class="label-text">{m.announcementVisibleUntil()}</span>
					<input type="datetime-local" class="input w-full" bind:value={visibleUntil} />
					<span class="text-base-content/60 text-xs">
						{m.announcementVisibleUntilHint()}
						{m.announcementTimezoneHint({ timezone })}
					</span>
				</label>
			</FormFieldset>

			<FormFieldset title={m.announcementAttachments()}>
				{#if kept.length + added.length > 0}
					<ul class="mb-2 flex flex-col gap-1">
						{#each kept as file (file.id)}
							<li class="flex items-center gap-2 text-sm">
								<i aria-hidden="true" class="ph-duotone ph-paperclip"></i>
								<span class="min-w-0 flex-1 truncate">
									{file.fileName ?? m.announcementAttachment()}
								</span>
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									aria-label={m.announcementAttachmentRemove({
										file: file.fileName ?? m.announcementAttachment()
									})}
									onclick={() => (kept = kept.filter((other) => other.id !== file.id))}
								>
									<i aria-hidden="true" class="ph-duotone ph-trash"></i>
								</button>
							</li>
						{/each}
						{#each added as file, index (index)}
							<li class="flex items-center gap-2 text-sm">
								<i aria-hidden="true" class="ph-duotone ph-upload-simple"></i>
								<span class="min-w-0 flex-1 truncate">{file.name}</span>
								<button
									type="button"
									class="btn btn-ghost btn-xs"
									aria-label={m.announcementAttachmentRemove({ file: file.name })}
									onclick={() => (added = added.filter((_, other) => other !== index))}
								>
									<i aria-hidden="true" class="ph-duotone ph-trash"></i>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<input
					type="file"
					class="file-input file-input-sm w-full"
					multiple
					accept="application/pdf,image/png,image/jpeg,image/webp"
					aria-label={m.announcementAttachmentAdd()}
					onchange={pickFiles}
				/>
				<p class="text-xs {tooManyFiles ? 'text-error' : 'text-base-content/60'}">
					{m.announcementAttachmentHint({ max: MAX_ANNOUNCEMENT_ATTACHMENTS })}
				</p>
			</FormFieldset>
		</div>

		<div class="flex min-w-0 flex-col gap-2">
			<span class="label-text">{m.preview()}</span>
			<AnnouncementCard
				title={title || m.announcementTitleLabel()}
				{body}
				{importance}
				{pinned}
				signature={signature.trim() || null}
				attachments={kept}
				expanded
			/>
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
