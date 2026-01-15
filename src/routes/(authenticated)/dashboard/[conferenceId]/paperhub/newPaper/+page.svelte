<script lang="ts">
	import PaperEditor from '$lib/components/Paper/Editor';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import { cache, graphql, type PaperType$options } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import toast from 'svelte-french-toast';
	import { editorContentStore } from '$lib/components/Paper/Editor/editorStore';
	import { goto, invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let delegationMember = $derived(
		data.getPaperDelegationMemberQuery?.data.findUniqueDelegationMember
	);
	let delegation = $derived(delegationMember?.delegation);
	let committee = $derived(delegationMember?.assignedCommittee);
	let conferenceAgendaItems = $derived(
		data.getPaperDelegationMemberQuery?.data.findManyAgendaItems
	);

	const createPaperMutation = graphql(`
		mutation CreatePaperMutation(
			$conferenceId: String!
			$userId: String!
			$delegationId: String!
			$type: PaperType!
			$content: Json!
			$agendaItemId: String
			$status: PaperStatus
		) {
			createOnePaper(
				data: {
					conferenceId: $conferenceId
					authorId: $userId
					delegationId: $delegationId
					type: $type
					content: $content
					status: $status
					agendaItemId: $agendaItemId
				}
			) {
				id
			}
		}
	`);

	let form = superForm(data.form, {
		onSubmit: (input) => {
			// We don't want to send a POST request to the server, instead we are handling the GraphQL mutation locally
			input.cancel();
		}
	});
	let { form: formData } = $derived(form);

	const typeOptions: { value: PaperType$options; label: string }[] = $derived.by(() => {
		if (delegation?.assignedNonStateActor) {
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
		if (delegation?.assignedNonStateActor) {
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

	const saveFile = async (options: { submit?: boolean } = {}) => {
		const { submit = false } = options;

		if (!$formData.agendaItemId && $formData.type !== 'INTRODUCTION_PAPER') {
			toast.error(m.paperAgendaItemRequired());
			return;
		}

		const resposne = await toast.promise(
			createPaperMutation.mutate({
				conferenceId: data.conferenceId,
				userId: data.user.sub,
				delegationId: delegation?.id,
				type: $formData.type,
				content: $editorContentStore,
				agendaItemId: $formData.type === 'INTRODUCTION_PAPER' ? undefined : $formData.agendaItemId,
				status: submit ? 'SUBMITTED' : 'DRAFT'
			}),
			{
				loading: submit ? m.paperSubmitting() : m.paperSavingDraft(),
				success: submit ? m.paperSubmittedSuccessfully() : m.paperDraftSavedSuccessfully(),
				error: submit ? m.paperSubmitError() : m.paperSaveDraftError()
			}
		);

		cache.markStale();
		await invalidateAll();

		if (resposne?.data.createOnePaper?.id) {
			goto(`/dashboard/${data.conferenceId}/paperhub`);
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

			<div class="join join-vertical w-full">
				<button class="btn btn-primary btn-outline btn-lg join-item" onclick={() => saveFile()}>
					<i class="fa-solid fa-pencil mr-2"></i>
					{m.paperSaveDraft()}
				</button>
				<button class="btn btn-primary btn-lg join-item" onclick={() => saveFile({ submit: true })}>
					<i class="fa-solid fa-paper-plane mr-2"></i>
					{m.paperSubmit()}
				</button>
			</div>
		</div>
		{#if $formData.type === 'WORKING_PAPER'}
			<PaperEditor.ResolutionEditor committeeName={committee?.name ?? 'Committee'} editable />
		{:else}
			<PaperEditor.PaperFormat editable />
		{/if}
	</Form>
</div>
