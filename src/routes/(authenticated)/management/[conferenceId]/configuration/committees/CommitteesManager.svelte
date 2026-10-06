<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache } from '$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import type { z } from 'zod';
	import AddCommitteeModal from './AddCommitteeModal.svelte';
	import CommitteeCard from './CommitteeCard.svelte';
	import DeleteAgendaItemModal from './DeleteAgendaItemModal.svelte';
	import DeleteCommitteeModal from './DeleteCommitteeModal.svelte';
	import EditAgendaItemModal from './EditAgendaItemModal.svelte';
	import EditCommitteeModal from './EditCommitteeModal.svelte';
	import { AddAgendaItemFormSchema } from './form-schema';
	import type { AgendaItem, ManagedCommittee } from './types';

	interface Props {
		conferenceId: string;
		committees: ManagedCommittee[];
		/** creating and deleting committees and changing their seats per delegation */
		canConfigure: boolean;
		agendaItemForm: SuperValidated<z.infer<typeof AddAgendaItemFormSchema>>;
		/** the form action adding agenda items, e.g. a named action of the page */
		agendaItemFormAction?: string;
	}

	let { conferenceId, committees, canConfigure, agendaItemForm, agendaItemFormAction }: Props =
		$props();

	// svelte-ignore state_referenced_locally
	const form = superForm(agendaItemForm, {
		resetForm: true,
		validationMethod: 'oninput',
		validators: zod4Client(AddAgendaItemFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult() {
			cache.markStale();
			invalidateAll();
		}
	});

	let addCommitteeModalOpen = $state(false);
	let committeeToEdit = $state<ManagedCommittee>();
	let committeeToDelete = $state<ManagedCommittee>();
	let agendaItemToEdit = $state<AgendaItem>();
	let agendaItemToDelete = $state<AgendaItem>();
</script>

<div class="flex flex-col gap-4">
	{#if canConfigure}
		<button class="btn btn-primary self-end" onclick={() => (addCommitteeModalOpen = true)}>
			<i class="fa-solid fa-plus"></i>
			{m.addCommittee()}
		</button>
	{/if}

	{#each committees as committee (committee.id)}
		<CommitteeCard
			{committee}
			{canConfigure}
			onEdit={() => (committeeToEdit = committee)}
			onDelete={() => (committeeToDelete = committee)}
			onEditAgendaItem={(item) => (agendaItemToEdit = item)}
			onDeleteAgendaItem={(item) => (agendaItemToDelete = item)}
		/>
	{/each}

	<FormFieldset title={m.createNewAgendaItem()}>
		<Form {form} action={agendaItemFormAction}>
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

<AddCommitteeModal {conferenceId} bind:open={addCommitteeModalOpen} />
<EditCommitteeModal bind:committee={committeeToEdit} {canConfigure} />
<DeleteCommitteeModal bind:committee={committeeToDelete} />
<EditAgendaItemModal bind:item={agendaItemToEdit} />
<DeleteAgendaItemModal bind:item={agendaItemToDelete} />
