<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { cache, graphql } from '$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import toast from 'svelte-french-toast';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { superForm } from 'sveltekit-superforms';
	import { AddAgendaItemFormSchema } from './form-schema';
	import { invalidateAll } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let { data }: { data: PageData } = $props();

	let query = $derived(data.data);
	let committees = $derived(query.findManyCommittees);

	let form = superForm(data.addAgendaItemForm, {
		resetForm: true,
		validationMethod: 'oninput',
		validators: zod4Client(AddAgendaItemFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult(_e) {
			cache.markStale();
			invalidateAll();
		}
	});

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

	const DeleteAgendaItemMutation = graphql(`
		mutation DeleteAgendaItemMutation($id: String!) {
			deleteOneAgendaItem(where: { id: $id }) {
				id
			}
		}
	`);

	const UpdateCommitteeMutation = graphql(`
		mutation UpdateCommitteeMutation(
			$id: String!
			$name: String
			$abbreviation: String
			$resolutionHeadline: String
		) {
			updateOneCommittee(
				where: { id: $id }
				data: { name: $name, abbreviation: $abbreviation, resolutionHeadline: $resolutionHeadline }
			) {
				id
			}
		}
	`);

	const UpdateAgendaItemMutation = graphql(`
		mutation UpdateAgendaItemMutation($id: String!, $title: String!, $teaserText: String) {
			updateOneAgendaItem(
				where: { id: $id }
				data: { title: { set: $title }, teaserText: { set: $teaserText } }
			) {
				id
			}
		}
	`);

	async function saveCommittee() {
		await toast.promise(
			UpdateCommitteeMutation.mutate({
				id: editingCommittee.id,
				name: editingCommittee.name,
				abbreviation: editingCommittee.abbreviation,
				resolutionHeadline: editingCommittee.resolutionHeadline
			}),
			genericPromiseToastMessages
		);
		editCommitteeModalOpen = false;
		cache.markStale();
		invalidateAll();
	}

	async function saveAgendaItem() {
		await toast.promise(
			UpdateAgendaItemMutation.mutate({
				id: editingAgendaItem.id,
				title: editingAgendaItem.title,
				teaserText: editingAgendaItem.teaserText
			}),
			genericPromiseToastMessages
		);
		editAgendaItemModalOpen = false;
		cache.markStale();
		invalidateAll();
	}

	async function confirmDelete() {
		await toast.promise(
			DeleteAgendaItemMutation.mutate({ id: deleteConfirmation.id }),
			genericPromiseToastMessages
		);
		deleteModalOpen = false;
		cache.markStale();
		invalidateAll();
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
					<input type="text" class="input input-bordered w-full" bind:value={editingCommittee.name} />
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
						bind:value={editingAgendaItem.teaserText}
					></textarea>
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
