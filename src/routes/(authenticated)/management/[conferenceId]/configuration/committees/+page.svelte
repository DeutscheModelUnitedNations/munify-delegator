<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import Form from '$lib/components/form/Form.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import { toast } from 'svelte-sonner';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { AddAgendaItemFormSchema } from './form-schema';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);

	const committees = $derived(
		await client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			abbreviation: true,
			name: true,
			resolutionHeadline: true,
			agendaItems: {
				id: true,
				title: true,
				teaserText: true,
				papers: { id: true }
			}
		})
	);

	const form = superForm(
		defaults({ committeeId: '', title: '', teaserText: '' }, zod4Client(AddAgendaItemFormSchema)),
		{
			SPA: true,
			resetForm: true,
			validationMethod: 'oninput',
			validators: zod4Client(AddAgendaItemFormSchema),
			onError(e) {
				toast.error(e.result.error.message);
			},
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.createAgendaItem({
					__args: { ...validated.data, teaserText: validated.data.teaserText || undefined },
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
			}
		}
	);

	// Committee editing state
	let editCommitteeModalOpen = $state(false);
	let editingCommittee = $state<{
		id: string;
		name: string;
		abbreviation: string;
		resolutionHeadline: string | null;
	}>({ id: '', name: '', abbreviation: '', resolutionHeadline: null });

	// Agenda item editing state
	let editAgendaItemModalOpen = $state(false);
	let editingAgendaItem = $state<{
		id: string;
		title: string;
		teaserText: string | null;
	}>({ id: '', title: '', teaserText: null });

	// Delete confirmation state
	let deleteModalOpen = $state(false);
	let deleteConfirmation = $state<{
		id: string;
		title: string;
		paperCount: number;
		confirmText: string;
	}>({ id: '', title: '', paperCount: 0, confirmText: '' });

	async function saveCommittee() {
		const promise = client.mutate.updateCommittee({
			__args: {
				id: editingCommittee.id,
				name: editingCommittee.name,
				abbreviation: editingCommittee.abbreviation,
				resolutionHeadline: editingCommittee.resolutionHeadline
			},
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		editCommitteeModalOpen = false;
	}

	async function saveAgendaItem() {
		const promise = client.mutate.updateAgendaItem({
			__args: {
				id: editingAgendaItem.id,
				title: editingAgendaItem.title,
				teaserText: editingAgendaItem.teaserText
			},
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		editAgendaItemModalOpen = false;
	}

	async function confirmDelete() {
		const promise = Promise.resolve(
			client.mutate.deleteAgendaItem({ __args: { id: deleteConfirmation.id } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		deleteModalOpen = false;
	}

	function openEditCommittee(committee: {
		id: string;
		name: string;
		abbreviation: string;
		resolutionHeadline: string | null;
	}) {
		editingCommittee = {
			id: committee.id,
			name: committee.name,
			abbreviation: committee.abbreviation,
			resolutionHeadline: committee.resolutionHeadline
		};
		editCommitteeModalOpen = true;
	}

	function openEditAgendaItem(item: { id: string; title: string; teaserText: string | null }) {
		editingAgendaItem = {
			id: item.id,
			title: item.title,
			teaserText: item.teaserText
		};
		editAgendaItemModalOpen = true;
	}

	function openDeleteConfirmation(item: { id: string; title: string; papers: { id: string }[] }) {
		deleteConfirmation = {
			id: item.id,
			title: item.title,
			paperCount: item.papers.length,
			confirmText: ''
		};
		deleteModalOpen = true;
	}
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<h1 class="text-2xl">
		{m.committeesAndAgendaItems()}
	</h1>

	{#each committees as committee}
		{@const agendaItems = committee.agendaItems}
		<div class="card bg-base-200 shadow-md">
			<div class="card-body">
				<div class="flex items-center justify-between">
					<h3 class="text-xl font-bold">{committee.name} ({committee.abbreviation})</h3>
					<button class="btn btn-ghost btn-sm" onclick={() => openEditCommittee(committee)}>
						<i class="fas fa-edit"></i>
						{m.edit()}
					</button>
				</div>
				{#if committee.resolutionHeadline}
					<p class="text-sm opacity-70">{m.resolutionHeadline()}: {committee.resolutionHeadline}</p>
				{/if}
				{#each agendaItems as item}
					<div class="bg-base-300 flex items-center gap-2 rounded-md px-4 py-2">
						<div class="flex w-full flex-1 flex-col gap-2">
							<h4>{item.title}</h4>
							{#if item.teaserText}
								<p class="text-xs whitespace-pre-wrap">{item.teaserText}</p>
							{/if}
							{#if item.papers.length > 0}
								<span class="badge badge-info badge-sm"
									>{item.papers.length} {item.papers.length === 1 ? 'Paper' : 'Papers'}</span
								>
							{/if}
						</div>
						<button class="btn btn-sm" onclick={() => openEditAgendaItem(item)}>
							<i class="fas fa-edit"></i>
						</button>
						<button
							class="btn btn-error btn-sm"
							aria-label="Delete"
							onclick={() => openDeleteConfirmation(item)}
						>
							<i class="fas fa-xmark"></i>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<FormFieldset title={m.createNewAgendaItem()}>
		<Form {form}>
			<FormSelect
				{form}
				name="committeeId"
				label={m.committee()}
				options={committees.map((x) => ({ label: x.abbreviation, value: x.id }))}
			/>
			<FormTextInput {form} name="title" label={m.title()} />
			<FormTextArea {form} name="teaserText" label={m.teaserText()} />
		</Form>
	</FormFieldset>
</div>

<!-- Committee Edit Modal -->
<Modal bind:open={editCommitteeModalOpen} title={m.editCommittee()}>
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.basicInfo()}>
			<div class="flex flex-col gap-4">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.name()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingCommittee.name}
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.abbreviation()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingCommittee.abbreviation}
					/>
				</label>
			</div>
		</FormFieldset>
		<FormFieldset title={m.resolutionHeadline()}>
			<label class="form-control w-full">
				<input
					type="text"
					class="input input-bordered w-full"
					placeholder={m.resolutionHeadlinePlaceholder()}
					bind:value={editingCommittee.resolutionHeadline}
				/>
				<div class="label">
					<span class="label-text-alt opacity-70 break-words whitespace-normal"
						>{m.resolutionHeadlineHint()}</span
					>
				</div>
			</label>
		</FormFieldset>
	</div>
	<div class="modal-action">
		<button class="btn" onclick={() => (editCommitteeModalOpen = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={saveCommittee}>{m.save()}</button>
	</div>
</Modal>

<!-- Agenda Item Edit Modal -->
<Modal bind:open={editAgendaItemModalOpen} title={m.editAgendaItem()}>
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.agendaItemDetails()}>
			<div class="flex flex-col gap-4">
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.title()}</span>
					</div>
					<input
						type="text"
						class="input input-bordered w-full"
						bind:value={editingAgendaItem.title}
					/>
				</label>
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text break-words">{m.teaserText()}</span>
					</div>
					<textarea
						class="textarea textarea-bordered w-full"
						bind:value={editingAgendaItem.teaserText}></textarea>
				</label>
			</div>
		</FormFieldset>
	</div>
	<div class="modal-action">
		<button class="btn" onclick={() => (editAgendaItemModalOpen = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={saveAgendaItem}>{m.save()}</button>
	</div>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={deleteModalOpen} title={m.deleteAgendaItem()}>
	<div class="flex flex-col gap-4">
		{#if deleteConfirmation.paperCount > 0}
			<div class="alert alert-warning">
				<i class="fas fa-exclamation-triangle flex-shrink-0"></i>
				<span class="break-words"
					>{m.agendaItemHasPapers({ count: deleteConfirmation.paperCount })}</span
				>
			</div>
			<FormFieldset title={m.confirmation()}>
				<p class="mb-2 break-words">{m.typeToConfirmDelete({ title: deleteConfirmation.title })}</p>
				<input
					type="text"
					class="input input-bordered w-full"
					placeholder={deleteConfirmation.title}
					bind:value={deleteConfirmation.confirmText}
				/>
			</FormFieldset>
		{:else}
			<p class="break-words">{m.confirmDeleteAgendaItem({ title: deleteConfirmation.title })}</p>
		{/if}
	</div>
	<div class="modal-action">
		<button class="btn" onclick={() => (deleteModalOpen = false)}>{m.cancel()}</button>
		<button
			class="btn btn-error"
			disabled={deleteConfirmation.paperCount > 0 &&
				deleteConfirmation.confirmText !== deleteConfirmation.title}
			onclick={confirmDelete}
		>
			{m.delete()}
		</button>
	</div>
</Modal>
