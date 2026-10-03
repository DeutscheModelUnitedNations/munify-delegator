<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { deserialize } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { conferenceResolutionsQuery } from '$lib/queries/conferenceResolutionsQuery';
	import {
		buildResolutionUploadForm,
		findResolutionUploadProblem,
		summarizeResolutionUploadResult
	} from '$lib/services/resolutionUpload';
	import { resolutionUploadProblemMessages } from '$lib/services/resolutionUploadMessages';
	import Modal from '$lib/components/Modal.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import ResolutionRow, { type Committee, type Resolution } from './ResolutionRow.svelte';

	let {
		conferenceId,
		resolutions,
		committees
	}: {
		conferenceId: string;
		resolutions: Resolution[];
		committees: Committee[];
	} = $props();

	let uploading = $state(false);
	let uploadCommitteeId = $state('');

	// Delete confirmation state
	let deleteModalOpen = $state(false);
	let deleteTarget = $state<{ id: string; title: string }>({ id: '', title: '' });

	// After a change only the resolutions are re-fetched. Invalidating the whole page
	// would also reload the surrounding settings form and discard its unsaved edits.
	let refreshedResolutions = $state<Resolution[]>();
	const list = $derived(refreshedResolutions ?? resolutions);

	async function refreshResolutions() {
		cache.markStale();
		const result = await conferenceResolutionsQuery.fetch({ variables: { conferenceId } });
		refreshedResolutions = result.data?.findManyResolutions ?? refreshedResolutions;
	}

	const DeleteResolutionMutation = graphql(`
		mutation DeleteResolutionConfigMutation($id: String!) {
			deleteResolution(id: $id) {
				id
			}
		}
	`);

	async function handleFilesSelected(
		event: Event & { currentTarget: EventTarget & HTMLInputElement }
	) {
		const input = event.currentTarget;
		const files = Array.from(input.files ?? []);
		if (files.length > 0 && isUploadable(files)) {
			await uploadFiles(files);
		}
		// Reset the input so selecting the same file again re-triggers the change event.
		input.value = '';
	}

	function isUploadable(files: File[]) {
		const problem = findResolutionUploadProblem(files);
		if (problem) toast.error(resolutionUploadProblemMessages[problem]());
		return !problem;
	}

	async function uploadFiles(files: File[]) {
		uploading = true;
		try {
			const response = await fetch('?/uploadResolutions', {
				method: 'POST',
				body: buildResolutionUploadForm(files, uploadCommitteeId)
			});
			await handleUploadResult(deserialize(await response.text()));
		} catch {
			toast.error(m.resolutionUploadError());
		} finally {
			uploading = false;
		}
	}

	async function handleUploadResult(result: ActionResult) {
		const { ok, error, storedAny } = summarizeResolutionUploadResult(result);
		if (ok) toast.success(m.resolutionUploadSuccess());
		else toast.error(error ?? m.resolutionUploadError());
		// Some files may have been stored even if a later one failed - show them.
		if (storedAny) await refreshResolutions();
	}

	function openDelete(resolution: Resolution) {
		deleteTarget = { id: resolution.id, title: resolution.title };
		deleteModalOpen = true;
	}

	async function confirmDelete() {
		const promise = DeleteResolutionMutation.mutate({ id: deleteTarget.id });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteModalOpen = false;
		await refreshResolutions();
	}
</script>

<FormFieldset title={m.adoptedResolutions()}>
	<p class="text-sm opacity-70">{m.adoptedResolutionsDescription()}</p>

	<!-- Upload -->
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

	<!-- Managed list -->
	{#if list.length === 0}
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
					{#each list as resolution (resolution.id)}
						<ResolutionRow
							{resolution}
							{committees}
							onchanged={refreshResolutions}
							ondelete={openDelete}
						/>
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
