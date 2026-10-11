<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { client } from '$lib/api/rumbleClient/client';
	import { fileToDataURL } from '$lib/helpers/fileToDataURL';
	import { findResolutionUploadProblem, uploadEach } from '$lib/helpers/resolutionUpload';
	import { resolutionUploadProblemMessages } from '$lib/helpers/resolutionUploadMessages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import Modal from '$lib/components/Modal.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import ResolutionRow from './ResolutionRow.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const [resolutions, committees] = $derived(
		await Promise.all([
			client.liveQuery.resolutions({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				id: true
			}),
			client.liveQuery.committees({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true,
				name: true,
				abbreviation: true
			})
		])
	);

	let uploading = $state(false);
	let uploadCommitteeId = $state('');

	let deleteModalOpen = $state(false);
	let deleteTarget = $state<{ id: string; title: string }>({ id: '', title: '' });

	async function handleFilesSelected(
		event: Event & { currentTarget: EventTarget & HTMLInputElement }
	) {
		const input = event.currentTarget;
		const files = Array.from(input.files ?? []);
		const problem = findResolutionUploadProblem(files);
		if (problem) {
			toast.error(resolutionUploadProblemMessages[problem]());
		} else {
			await uploadFiles(files);
		}
		// Reset the input so selecting the same file again re-triggers the change event.
		input.value = '';
	}

	async function uploadFiles(files: File[]) {
		uploading = true;
		const failed = await uploadEach(files, async (file) =>
			client.mutate.createResolution({
				__args: {
					conferenceId,
					committeeId: uploadCommitteeId || undefined,
					fileName: file.name,
					content: (await fileToDataURL(file)) ?? ''
				},
				id: true
			})
		);
		uploading = false;
		reportUpload(failed, files.length);
	}

	function reportUpload(failed: string[], total: number) {
		if (failed.length === 0) toast.success(m.resolutionUploadSuccess());
		else if (failed.length === total) toast.error(m.resolutionUploadError());
		else toast.error(m.resolutionUploadPartialError({ files: failed.join(', ') }));
	}

	function openDelete(resolution: { id: string; title: string }) {
		deleteTarget = resolution;
		deleteModalOpen = true;
	}

	async function confirmDelete() {
		const promise = Promise.resolve(
			client.mutate.deleteResolution({ __args: { id: deleteTarget.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteModalOpen = false;
	}
</script>

<FormFieldset title={m.adoptedResolutions()}>
	<p class="text-sm opacity-70">{m.adoptedResolutionsDescription()}</p>

	<div class="flex flex-col gap-2">
		{#if committees.length > 0}
			<label class="form-control w-full max-w-sm">
				<div class="label">
					<span class="label-text">{m.resolutionUploadCommitteeLabel()}</span>
				</div>
				<select class="select select-bordered w-full" bind:value={uploadCommitteeId}>
					<option value="">{m.resolutionNoCommittee()}</option>
					{#each committees as committee (committee.id)}
						<option value={committee.id}>{committee.name} ({committee.abbreviation})</option>
					{/each}
				</select>
			</label>
		{/if}

		<label for="resolution-upload" class="flex w-full flex-col gap-1">
			<span class="label-text">{m.resolutionUploadLabel()}</span>
			<input
				id="resolution-upload"
				type="file"
				class="file-input w-full"
				accept="application/pdf"
				multiple
				disabled={uploading}
				onchange={handleFilesSelected}
			/>
		</label>
		{#if uploading}
			<span class="text-sm opacity-70">
				<i class="fas fa-spinner fa-spin"></i>
				{m.resolutionUploading()}
			</span>
		{/if}
	</div>

	{#if resolutions.length === 0}
		<div class="alert alert-info mt-2">
			<i class="fas fa-circle-info"></i>
			<span>{m.resolutionListEmpty()}</span>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>{m.resolutionColumnTitle()}</th>
						<th>{m.resolutionColumnCommittee()}</th>
						<th class="text-right">{m.resolutionColumnActions()}</th>
					</tr>
				</thead>
				<tbody>
					{#each resolutions as resolution (resolution.id)}
						<ResolutionRow resolutionId={resolution.id} {committees} ondelete={openDelete} />
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</FormFieldset>

<Modal bind:open={deleteModalOpen} title={m.resolutionDeleteTitle()}>
	<p class="py-4">{m.resolutionDeleteConfirm({ title: deleteTarget.title })}</p>
	{#snippet action()}
		<button type="button" class="btn" onclick={() => (deleteModalOpen = false)}>
			{m.cancel()}
		</button>
		<button type="button" class="btn btn-error" onclick={confirmDelete}>
			<i class="fas fa-trash mr-2"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
