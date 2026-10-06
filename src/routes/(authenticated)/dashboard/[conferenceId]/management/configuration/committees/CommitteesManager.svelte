<!--
	@component
	The committees of a conference with their agenda items: create, edit and delete a committee, edit
	or delete an agenda item, create a new one. Used by the configuration page's committees tab and
	by the standalone committees page.
-->
<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Form from '$lib/components/form/Form.svelte';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormTextArea from '$lib/components/form/FormTextArea.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { canConfigureCommittees } from '$lib/helpers/managementAccess';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { managementMembership } from '../../managementMembership';
	import AddCommitteeModal from './AddCommitteeModal.svelte';
	import CommitteeCard from './CommitteeCard.svelte';
	import DeleteAgendaItemModal from './DeleteAgendaItemModal.svelte';
	import DeleteCommitteeModal from './DeleteCommitteeModal.svelte';
	import EditAgendaItemModal from './EditAgendaItemModal.svelte';
	import EditCommitteeModal from './EditCommitteeModal.svelte';
	import { AddAgendaItemFormSchema } from './form-schema';
	import type { AgendaItem, ManagedCommittee } from './types';

	let { conferenceId }: { conferenceId: string } = $props();

	const [committees, membership] = $derived(
		await Promise.all([
			client.liveQuery.committees({
				__args: {
					where: { conferenceId: { eq: conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true,
				resolutionHeadline: true,
				nations: { alpha3Code: true },
				delegationMembers: { id: true },
				agendaItems: { id: true, title: true, teaserText: true, papers: { id: true } }
			}),
			managementMembership(conferenceId)
		])
	);
	/** creating and deleting committees and changing their seats per delegation */
	const canConfigure = $derived(canConfigureCommittees(membership));

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

<AddCommitteeModal {conferenceId} bind:open={addCommitteeModalOpen} />
<EditCommitteeModal bind:committee={committeeToEdit} {canConfigure} />
<DeleteCommitteeModal bind:committee={committeeToDelete} />
<EditAgendaItemModal bind:item={agendaItemToEdit} />
<DeleteAgendaItemModal bind:item={agendaItemToDelete} />
