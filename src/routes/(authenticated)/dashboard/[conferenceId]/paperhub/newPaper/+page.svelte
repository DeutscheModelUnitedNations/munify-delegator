<script lang="ts">
	import PaperEditor from '$lib/components/paper/editor';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { page } from '$app/state';
	import { fetchNewPaperContext } from './newPaperContext';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { toast } from 'svelte-sonner';
	import { editorContentStore } from '$lib/components/paper/editor/editorStore';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { DraftAutosave } from '$lib/components/paper/draft/draftAutosave.svelte';
	import DraftRecoveryModal from '$lib/components/paper/draft/DraftRecoveryModal.svelte';
	import { createPaper } from '../paperSaving';
	import NewPaperForm from '../NewPaperForm.svelte';
	import {
		agendaItemOptions,
		newPaperAgendaItemId,
		newPaperSaveError,
		paperTypeOptions
	} from './newPaperOptions';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Types for draft persistence (Position/Introduction Papers only)
	interface PaperDraft {
		type: 'POSITION_PAPER' | 'INTRODUCTION_PAPER';
		agendaItemId?: string;
		content: unknown;
		savedAt: number;
	}

	const currentUser = await getCurrentUser();

	// The draft, the form and the delegation it names are seeded once; re-reading them while
	// someone is writing would discard their work.
	const conferenceId = untrack(() => params.conferenceId);

	const draft = new DraftAutosave<PaperDraft, unknown>(`paperDraft_${conferenceId}`, {
		readContent: () => get(editorContentStore),
		toDraft: (content, savedAt) => {
			const currentFormData = get(form.form);
			return {
				type: currentFormData.type,
				agendaItemId: currentFormData.agendaItemId,
				content,
				savedAt
			};
		},
		applyDraft: (saved) => {
			$formData.type = saved.type;
			if (saved.agendaItemId) {
				$formData.agendaItemId = saved.agendaItemId;
			}
			$editorContentStore = saved.content;
		},
		resetEditor: () => {
			$editorContentStore = undefined;
		}
	});

	const context = await fetchNewPaperContext(
		conferenceId,
		currentUser.sub,
		untrack(() => page.url.searchParams.get('type'))
	);
	const delegationMember = $derived(context.delegationMember);
	let delegation = $derived(delegationMember?.delegation);
	let committee = $derived(delegationMember?.assignedCommittee);
	const conferenceAgendaItems = $derived(context.conferenceAgendaItems);

	let form = superForm(context.form, {
		onSubmit: (input) => {
			// We don't want to send a POST request to the server, instead we are handling the GraphQL mutation locally
			input.cancel();
		}
	});
	let { form: formData } = $derived(form);

	let isNSA = $derived(!!delegation?.assignedNonStateActor);

	const typeOptions = $derived(paperTypeOptions(isNSA));

	const agendaItems = $derived(
		agendaItemOptions({
			isNSA,
			type: $formData.type,
			conferenceAgendaItems,
			committeeAgendaItems: committee?.agendaItems
		})
	);

	const saveFile = async (submit: boolean) => {
		// Use TipTap editor content store
		const content = $editorContentStore;

		const error = newPaperSaveError($formData.type, $formData.agendaItemId, content);
		if (error) {
			toast.error(error);
			return;
		}

		await createPaper(
			{
				conferenceId: params.conferenceId,
				authorId: currentUser.sub,
				delegationId: delegation?.id,
				type: $formData.type,
				content,
				agendaItemId: newPaperAgendaItemId($formData.type, $formData.agendaItemId)
			},
			submit,
			() => {
				// Clear store so next paper creation starts fresh
				$editorContentStore = undefined;
				// Clear localStorage draft on successful submission
				draft.clear();
			}
		);
	};
</script>

<DraftRecoveryModal {draft} />

<NewPaperForm title={m.newPaper()} {form} onSave={saveFile}>
	{#snippet details()}
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
			<FormSelect name="agendaItemId" label={m.paperAgendaItem()} {form} options={agendaItems} />
		{/if}
	{/snippet}
	{#snippet editor()}
		{#key draft.editorKey}
			<PaperEditor.PaperFormat editable />
		{/key}
	{/snippet}
</NewPaperForm>
