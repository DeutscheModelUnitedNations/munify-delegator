<script lang="ts">
	import PaperEditor from '$lib/components/Paper/Editor';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import { type PaperType$options } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import toast from 'svelte-french-toast';

	let { data }: { data: PageData } = $props();

	let delegationMember = $derived(
		data.getPaperDelegationMemberQuery?.data.findUniqueDelegationMember
	);
	let delegation = $derived(delegationMember?.delegation);
	let committee = $derived(delegationMember?.assignedCommittee);
	let conferenceAgendaItems = $derived(
		data.getPaperDelegationMemberQuery?.data.findManyAgendaItems
	);

	let form = superForm(data.form);
	let { form: formData } = $derived(form);

	const typeOptions: { value: PaperType$options; label: string }[] = $derived.by(() => {
		if (!!delegation?.assignedNonStateActor) {
			return [
				{ value: 'INTRODUCTION_PAPER', label: m.paperTypeIntroductionPaper() },
				{ value: 'POSITION_PAPER', label: m.paperTypePositionPaper() }
			];
		} else {
			return [
				{ value: 'POSITION_PAPER', label: m.paperTypePositionPaper() },
				{ value: 'WORKING_PAPER', label: m.paperTypeWorkingPaper() }
			];
		}
	});

	const agendaItems: { value: string; label: string }[] = $derived.by(() => {
		if (!!delegation?.assignedNonStateActor) {
			return conferenceAgendaItems
				.map((item: NonNullable<typeof conferenceAgendaItems>[number]) => ({
					value: item.id,
					label: `${item.committee.abbreviation}: ${item.title}`
				}))
				.sort((a, b) => a.label.localeCompare(b.label));
		}
		if ($formData.type === 'INTRODUCTION_PAPER') {
			return [
				{
					value: 'INTRODUCTION_PAPER',
					label: m.paperAcrossCommittees()
				}
			];
		}
		return committee?.agendaItems.map((item) => ({
			value: item.id,
			label: item.title
		}));
	});

	const saveDraft = async () => {
		if (!$formData.agendaItemId && $formData.type !== 'INTRODUCTION_PAPER') {
			toast.error(m.paperAgendaItemRequired());
			return;
		}
	};
</script>

<div class="flex flex-col gap-2 w-full">
	<h2 class="text-2xl font-bold">{m.newPaper()}</h2>

	<div class="alert alert-warning">
		<i class="fa-solid fa-exclamation-triangle"></i>
		<span>{m.paperEditCautionAlert()}</span>
	</div>

	<Form {form} class="w-full flex flex-col xl:flex-row-reverse gap-4" showSubmitButton={false}>
		<div class="flex flex-col gap-4 xl:w-1/3">
			<FormFieldset title={m.paperDetails()}>
				<FormTextInput {form} name="delegation" disabled label={m.delegation()} />
				<FormSelect
					name="type"
					label={m.paperType()}
					{form}
					options={typeOptions}
					placeholder={m.paperType()}
				/>

				{#if $formData.committee}
					<FormTextInput {form} name="committee" disabled label={m.committee()} />
				{/if}
				{#if $formData.type !== 'INTRODUCTION_PAPER'}
					<FormSelect
						name="agendaItemId"
						label={m.paperAgendaItem()}
						{form}
						options={agendaItems}
					/>
				{/if}
			</FormFieldset>

			<button class="btn btn-primary btn-lg" onclick={saveDraft}>
				<i class="fa-solid fa-save mr-2"></i>
				{m.paperSaveDraft()}
			</button>
		</div>
		{#if $formData.type === 'WORKING_PAPER'}
			<PaperEditor.ResolutionFormat />
		{:else}
			<PaperEditor.PaperFormat />
		{/if}
	</Form>
</div>
