<!--
	@component
	The scanned pages kept of the person's application documents, each once: opened in place or in a new tab, uploaded
	by hand, deleted.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import type { PostalscansourceEnum } from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { formatFileSize } from './fileSize';
	import { inDocumentOrder, pageLabel } from './agreementGroupLabels';
	import { uploadScanFor } from './uploadScan';

	interface Props {
		conferenceId: string;
		userId: string;
		conferenceParticipantId: string;
	}

	let { conferenceId, userId, conferenceParticipantId }: Props = $props();

	const stored = $derived(
		await client.liveQuery.postalScans({
			__args: {
				where: { conferenceParticipantId: { eq: conferenceParticipantId } },
				orderBy: { createdAt: 'desc' }
			},
			source: true,
			updatedAt: true,
			fields: true,
			file: { fileName: true, mimeType: true, size: true, url: true }
		})
	);

	const scans = $derived(inDocumentOrder(stored));

	const sourceLabel: Record<PostalscansourceEnum, () => string> = {
		UPLOAD: () => m.postalScanSourceUpload(),
		FOLDER: () => m.postalScanSourceFolder(),
		WEBDAV: () => m.postalScanSourceWebdav()
	};

	let openId = $state<string>();
	let deleteId = $state<string>();
	let uploading = $state(false);
	const opened = $derived(scans.find((scan) => scan.id === openId));

	const nameOf = (scan: { fields: string[]; file: { fileName?: string | null } }) =>
		pageLabel(scan.fields) ?? scan.file.fileName ?? m.postalScanUntitled();

	const uploadError = (error: unknown) =>
		error instanceof Error ? error.message : m.genericToastError();

	/** Uploads one file; what fails is toasted, and the next is uploaded all the same. */
	async function uploadOne(file: File) {
		const promise = uploadScanFor({ file, conferenceId, userId });
		toast.promise(promise, { ...genericPromiseToastMessages, error: uploadError });
		await promise.catch(() => undefined);
	}

	async function upload(files: FileList | null) {
		if (uploading) return;
		uploading = true;
		try {
			for (const file of files ?? []) await uploadOne(file);
		} finally {
			uploading = false;
		}
	}

	async function remove(id: string) {
		const promise = Promise.resolve(client.mutate.deletePostalScan({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteId = undefined;
	}
</script>

<section class="flex flex-col gap-3" aria-label={m.postalScans()}>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h3 class="text-lg font-bold">{m.postalScans()}</h3>
		<label class="btn btn-sm {uploading ? 'btn-disabled' : ''}">
			<i aria-hidden="true" class="ph-duotone ph-upload-simple"></i>
			{m.postalScanUpload()}
			<input
				type="file"
				class="sr-only"
				multiple
				accept="application/pdf,image/jpeg,image/png,image/webp"
				disabled={uploading}
				onchange={async (event) => {
					const input = event.currentTarget;
					await upload(input.files);
					input.value = '';
				}}
			/>
		</label>
	</div>
	<ul class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		{#each scans as scan (scan.id)}
			<li class="flex items-center gap-3 px-4 py-2">
				<button
					class="flex min-w-0 grow items-center gap-3 text-left"
					onclick={() => (openId = scan.id)}
					aria-label={m.postalScanOpen({ name: nameOf(scan) })}
				>
					<i
						aria-hidden="true"
						class="ph-duotone {scan.file.mimeType === 'application/pdf'
							? 'ph-file-pdf'
							: 'ph-file-image'} text-primary text-2xl"
					></i>
					<span class="flex min-w-0 flex-col">
						<span class="truncate font-medium">{nameOf(scan)}</span>
						<span class="text-base-content/60 text-xs">
							{scan.updatedAt.toLocaleString(getLocale(), {
								dateStyle: 'medium',
								timeStyle: 'short'
							})} · {formatFileSize({
								bytes: scan.file.size,
								locale: getLocale()
							})} · {sourceLabel[scan.source]()} · {scan.file.fileName ?? m.postalScanUntitled()}
						</span>
					</span>
				</button>
				<a
					class="btn btn-ghost btn-sm btn-square"
					href={scan.file.url}
					target="_blank"
					rel="noreferrer external"
					aria-label="{nameOf(scan)}: {m.postalScanOpenNewTab()}"
					title={m.postalScanOpenNewTab()}
				>
					<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
				</a>
				<button
					class="btn btn-ghost btn-sm btn-square text-error"
					onclick={() => (deleteId = scan.id)}
					aria-label={m.postalScanDelete({ name: nameOf(scan) })}
					title={m.delete()}
				>
					<i aria-hidden="true" class="ph-duotone ph-trash"></i>
				</button>
			</li>
		{:else}
			<li class="text-base-content/60 px-4 py-3 text-sm">{m.postalScansNone()}</li>
		{/each}
	</ul>
</section>

{#if opened}
	<Modal open title={nameOf(opened)} fullWidth onclose={() => (openId = undefined)}>
		{#if opened.file.mimeType === 'application/pdf'}
			<iframe class="h-[75dvh] w-full sm:w-[80vw]" src={opened.file.url} title={nameOf(opened)}
			></iframe>
		{:else}
			<img class="mx-auto max-h-[75dvh]" src={opened.file.url} alt={nameOf(opened)} />
		{/if}
		{#snippet action()}
			<a class="btn" href={opened.file.url} target="_blank" rel="noreferrer external">
				<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
				{m.postalScanOpenNewTab()}
			</a>
		{/snippet}
	</Modal>
{/if}

{#if deleteId}
	{@const id = deleteId}
	<ConfirmDeleteModal
		title={m.postalScanDeleteTitle()}
		text={m.postalScanDeleteConfirm()}
		onConfirm={() => remove(id)}
		onClose={() => (deleteId = undefined)}
	/>
{/if}
