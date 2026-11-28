<!--
	@component
	The scanned pages kept of the person's application documents, each once, as cards side by side with a
	small picture of each: opened large with where its fields are read (`ScanPreview`), in a new tab,
	deleted.
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
	import ScanPreview from './ScanPreview.svelte';
	import ScanThumbnail from './ScanThumbnail.svelte';
	import { formatFileSize } from './fileSize';
	import { inDocumentOrder, pageLabel } from './agreementGroupLabels';

	let { conferenceParticipantId }: { conferenceParticipantId: string } = $props();

	const stored = $derived(
		await client.liveQuery.postalScans({
			__args: {
				where: { conferenceParticipantId: { eq: conferenceParticipantId } },
				orderBy: { createdAt: 'desc' }
			},
			source: true,
			updatedAt: true,
			fields: true,
			readings: true,
			file: { fileName: true, mimeType: true, size: true, url: true }
		})
	);

	const scans = $derived(inDocumentOrder(stored));

	const sourceLabel: Record<PostalscansourceEnum, () => string> = {
		UPLOAD: () => m.postalScanSourceUpload(),
		FOLDER: () => m.postalScanSourceFolder(),
		WEBDAV: () => m.postalScanSourceWebdav(),
		CAMERA: () => m.postalScanSourceCamera()
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

{#snippet fileIcon(mimeType: string)}
	<i
		aria-hidden="true"
		class="ph-duotone {mimeType === 'application/pdf'
			? 'ph-file-pdf'
			: 'ph-file-image'} text-base-content/40 text-3xl"
	></i>
{/snippet}

<ul class="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3" aria-label={m.postalScans()}>
	{#each scans as scan (scan.id)}
		<li
			class="bg-base-100 border-base-300 rounded-box flex min-w-0 flex-col overflow-hidden border"
		>
			<button
				class="bg-base-300 flex aspect-[210/297] cursor-pointer items-center justify-center overflow-hidden"
				onclick={() => (openId = scan.id)}
				aria-label={m.postalScanOpen({ name: nameOf(scan) })}
			>
				<svelte:boundary>
					<ScanThumbnail url={scan.file.url} />
					{#snippet pending()}
						<span class="loading loading-spinner text-base-content/40"></span>
					{/snippet}
					{#snippet failed()}
						{@render fileIcon(scan.file.mimeType)}
					{/snippet}
				</svelte:boundary>
			</button>
			<div class="flex items-start gap-2 p-3">
				<span class="flex min-w-0 grow flex-col">
					<span class="truncate font-semibold">{nameOf(scan)}</span>
					<span class="text-base-content/60 text-xs">
						{scan.updatedAt.toLocaleString(getLocale(), {
							dateStyle: 'medium',
							timeStyle: 'short'
						})} · {formatFileSize({
							bytes: scan.file.size,
							locale: getLocale()
						})} · {sourceLabel[scan.source]()}
					</span>
					<span class="text-base-content/60 truncate text-xs">
						{scan.file.fileName ?? m.postalScanUntitled()}
					</span>
				</span>
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
			</div>
		</li>
	{/each}
</ul>

{#if opened}
	<Modal open title={nameOf(opened)} fullWidth onclose={() => (openId = undefined)}>
		<svelte:boundary>
			<ScanPreview url={opened.file.url} name={nameOf(opened)} readings={opened.readings} />
			{#snippet pending()}
				<div class="flex h-[50dvh] w-screen max-w-full items-center justify-center">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{/snippet}
			{#snippet failed()}
				<p class="text-error">{m.postalScanLoadFailed()}</p>
			{/snippet}
		</svelte:boundary>
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
