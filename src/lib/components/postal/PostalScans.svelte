<!--
	@component
	The scanned pages kept of the person's application documents, each once, as rows of a user card list
	(`bg-base-200 rounded-box divide-y`): how many there are, with the upload, and folded below it each
	of them, opened in place or in a new tab, deleted.
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
	import CollapsibleRow from '#lib/components/userCard/sections/CollapsibleRow.svelte';
	import UploadScanButton from './UploadScanButton.svelte';
	import { formatFileSize } from './fileSize';
	import { inDocumentOrder, pageLabel } from './agreementGroupLabels';

	interface Props {
		conferenceId: string;
		userId: string;
		conferenceParticipantId: string;
		/** Lists the scans right away */
		unfolded?: boolean;
	}

	let { conferenceId, userId, conferenceParticipantId, unfolded = false }: Props = $props();

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
	const opened = $derived(scans.find((scan) => scan.id === openId));

	const nameOf = (scan: { fields: string[]; file: { fileName?: string | null } }) =>
		pageLabel(scan.fields) ?? scan.file.fileName ?? m.postalScanUntitled();

	async function remove(id: string) {
		const promise = Promise.resolve(client.mutate.deletePostalScan({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteId = undefined;
	}
</script>

<CollapsibleRow
	title={m.postalScansRow()}
	icon="scan"
	value={scans.length > 0 ? m.postalScansCount({ count: scans.length }) : undefined}
	{unfolded}
	children={scans.length > 0 ? list : undefined}
>
	{#snippet actions()}
		<UploadScanButton {conferenceId} {userId} />
	{/snippet}
</CollapsibleRow>

{#snippet list()}
	<ul class="divide-base-300 flex flex-col divide-y" aria-label={m.postalScans()}>
		{#each scans as scan (scan.id)}
			<li class="flex items-center gap-x-4 py-2">
				<button
					class="flex min-w-0 grow cursor-pointer items-center gap-4 text-left"
					onclick={() => (openId = scan.id)}
					aria-label={m.postalScanOpen({ name: nameOf(scan) })}
				>
					<i
						aria-hidden="true"
						class="ph-duotone {scan.file.mimeType === 'application/pdf'
							? 'ph-file-pdf'
							: 'ph-file-image'} text-base-content/60 w-6 shrink-0 text-center text-lg"
					></i>
					<span class="flex min-w-0 flex-col">
						<span class="truncate font-semibold">{nameOf(scan)}</span>
						<span class="text-base-content/60 text-sm">
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
				<div class="join">
					<a
						class="btn btn-sm btn-square join-item"
						href={scan.file.url}
						target="_blank"
						rel="noreferrer external"
						aria-label="{nameOf(scan)}: {m.postalScanOpenNewTab()}"
						title={m.postalScanOpenNewTab()}
					>
						<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
					</a>
					<button
						class="btn btn-sm btn-square join-item text-error"
						onclick={() => (deleteId = scan.id)}
						aria-label={m.postalScanDelete({ name: nameOf(scan) })}
						title={m.delete()}
					>
						<i aria-hidden="true" class="ph-duotone ph-trash"></i>
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

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
