<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import Modal from '$lib/components/Modal.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	interface Committee {
		id: string;
		name: string;
		abbreviation: string;
	}

	interface Resolution {
		id: string;
		title: string;
		fileName: string;
		committee: { id: string; name: string; abbreviation: string } | null;
	}

	let {
		resolutions,
		committees
	}: {
		resolutions: Resolution[];
		committees: Committee[];
	} = $props();

	let uploading = $state(false);
	let uploadCommitteeId = $state('');
	let fileInput = $state<HTMLInputElement>();

	// Delete confirmation state
	let deleteModalOpen = $state(false);
	let deleteTarget = $state<{ id: string; title: string }>({ id: '', title: '' });

	const UpdateResolutionMutation = graphql(`
		mutation UpdateResolutionConfigMutation(
			$id: String!
			$title: String
			$committeeId: String
			$clearCommittee: Boolean
		) {
			updateResolution(
				id: $id
				title: $title
				committeeId: $committeeId
				clearCommittee: $clearCommittee
			) {
				id
			}
		}
	`);

	const DeleteResolutionMutation = graphql(`
		mutation DeleteResolutionConfigMutation($id: String!) {
			deleteResolution(id: $id) {
				id
			}
		}
	`);

	async function handleFilesSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		uploading = true;
		const formData = new FormData();
		for (const file of Array.from(input.files)) {
			formData.append('files', file);
		}
		if (uploadCommitteeId) {
			formData.append('committeeId', uploadCommitteeId);
		}

		try {
			const response = await fetch('?/uploadResolutions', { method: 'POST', body: formData });
			const result = deserialize(await response.text());

			if (result.type === 'failure') {
				const uploadError =
					result.data && typeof result.data.uploadError === 'string'
						? result.data.uploadError
						: m.resolutionUploadError();
				toast.error(uploadError);
			} else if (result.type === 'error') {
				toast.error(result.error?.message ?? m.resolutionUploadError());
			} else {
				toast.success(m.resolutionUploadSuccess());
				cache.markStale();
				await invalidateAll();
			}
		} catch {
			toast.error(m.resolutionUploadError());
		} finally {
			uploading = false;
			// Reset the input so selecting the same file again re-triggers the change event.
			if (fileInput) fileInput.value = '';
		}
	}

	async function saveTitle(resolution: Resolution, event: FocusEvent) {
		const target = event.currentTarget as HTMLInputElement;
		const newTitle = target.value.trim();
		if (!newTitle || newTitle === resolution.title) {
			target.value = resolution.title;
			return;
		}
		const promise = UpdateResolutionMutation.mutate({ id: resolution.id, title: newTitle });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		cache.markStale();
		await invalidateAll();
	}

	async function changeCommittee(resolution: Resolution, event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const promise = value
			? UpdateResolutionMutation.mutate({ id: resolution.id, committeeId: value })
			: UpdateResolutionMutation.mutate({ id: resolution.id, clearCommittee: true });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		cache.markStale();
		await invalidateAll();
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
		cache.markStale();
		await invalidateAll();
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
				bind:this={fileInput}
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
						<tr>
							<td>
								<input
									type="text"
									class="input input-bordered input-sm w-full min-w-48"
									value={resolution.title}
									aria-label={m.resolutionColumnTitle()}
									onblur={(e) => saveTitle(resolution, e)}
								/>
								<div class="mt-1 text-xs opacity-60">
									<i class="fa-duotone fa-file-pdf"></i>
									{resolution.fileName}
								</div>
							</td>
							<td>
								{#if committees.length > 0}
									<select
										class="select select-bordered select-sm w-full min-w-40"
										value={resolution.committee?.id ?? ''}
										aria-label={m.resolutionColumnCommittee()}
										onchange={(e) => changeCommittee(resolution, e)}
									>
										<option value="">{m.resolutionNoCommittee()}</option>
										{#each committees as committee (committee.id)}
											<option value={committee.id}>{committee.abbreviation}</option>
										{/each}
									</select>
								{:else}
									<span class="opacity-60">—</span>
								{/if}
							</td>
							<td class="text-right">
								<a
									class="btn btn-ghost btn-sm"
									href={`/api/resolution/${resolution.id}`}
									target="_blank"
									rel="noopener"
									aria-label={m.resolutionDownload()}
								>
									<i class="fas fa-download"></i>
								</a>
								<button
									type="button"
									class="btn btn-ghost btn-sm text-error"
									onclick={() => openDelete(resolution)}
									aria-label={m.delete()}
								>
									<i class="fas fa-trash"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</FormFieldset>

<Modal bind:open={deleteModalOpen} title={m.resolutionDeleteTitle()}>
	<p class="py-4">{m.resolutionDeleteConfirm({ title: deleteTarget.title })}</p>
	{#snippet action()}
		<button class="btn" onclick={() => (deleteModalOpen = false)}>
			{m.cancel()}
		</button>
		<button class="btn btn-error" onclick={confirmDelete}>
			<i class="fas fa-trash mr-2"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
