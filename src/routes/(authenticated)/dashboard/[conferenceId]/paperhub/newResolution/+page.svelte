<script lang="ts">
	import PaperEditor from '$lib/components/paper/editor';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { fetchNewResolutionContext } from './newResolutionContext';
	import { m } from '$lib/paraglide/messages';
	import { superForm } from 'sveltekit-superforms';
	import FormSelect from '$lib/components/form/FormSelect.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import { toast } from 'svelte-sonner';
	import { resolutionStore } from '$lib/components/paper/editor/editorStore';
	import { untrack } from 'svelte';
	import {
		type Resolution,
		isClauseEmpty,
		createEmptyResolution
	} from '$lib/components/paper/editor/resolution';
	import { get } from 'svelte/store';
	import { DraftAutosave } from '$lib/components/paper/draft/draftAutosave.svelte';
	import DraftRecoveryModal from '$lib/components/paper/draft/DraftRecoveryModal.svelte';
	import { createPaper } from '../paperSaving';
	import { paperEntityName, resolutionHeader } from '../paperDisplay';
	import NewPaperForm from '../NewPaperForm.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Types for draft persistence
	interface ResolutionDraft {
		agendaItemId?: string;
		content: Resolution;
		savedAt: number;
	}

	// Helper to check if resolution has any meaningful content
	function isResolutionEmpty(resolution: Resolution): boolean {
		// Check if all preamble clauses are empty
		const preambleEmpty =
			resolution.preamble.length === 0 ||
			resolution.preamble.every((clause) => !clause.content.trim());

		// Check if all operative clauses are empty
		const operativeEmpty =
			resolution.operative.length === 0 ||
			resolution.operative.every((clause) => isClauseEmpty(clause));

		return preambleEmpty && operativeEmpty;
	}

	const currentUser = await getCurrentUser();

	// The draft, the form and the delegation it names are seeded once; re-reading them while
	// someone is writing would discard their work.
	const conferenceId = untrack(() => params.conferenceId);

	const resetResolution = () => resolutionStore.replaceResolution(createEmptyResolution(''));

	const draft = new DraftAutosave<ResolutionDraft, Resolution>(`resolutionDraft_${conferenceId}`, {
		// Skip saving if resolution has no meaningful content
		readContent: () =>
			isResolutionEmpty(resolutionStore.snapshot) ? undefined : resolutionStore.snapshot,
		toDraft: (content, savedAt) => ({
			agendaItemId: get(form.form).agendaItemId,
			content,
			savedAt
		}),
		applyDraft: (saved) => {
			if (saved.agendaItemId) {
				$formData.agendaItemId = saved.agendaItemId;
			}
			resolutionStore.replaceResolution(saved.content);
		},
		resetEditor: resetResolution
	});

	const context = await fetchNewResolutionContext(conferenceId, currentUser.sub);
	const delegationMember = $derived(context.delegationMember);
	let delegation = $derived(delegationMember.delegation);
	let committee = $derived(delegationMember.assignedCommittee);
	let conference = $derived(context.conference);

	let form = superForm(context.form, {
		onSubmit: (input) => {
			// We don't want to send a POST request to the server, instead we are handling the GraphQL mutation locally
			input.cancel();
		}
	});
	let { form: formData } = $derived(form);

	const agendaItems: { value: string; label: string }[] = $derived.by(() => {
		return (
			committee?.agendaItems.map((item) => ({
				value: item.id,
				label: item.title
			})) ?? []
		);
	});

	// Resolution header data for working papers
	let resolutionHeaderData = $derived(
		resolutionHeader(conference, {
			committee,
			topic: committee?.agendaItems.find((item) => item.id === $formData.agendaItemId)?.title,
			authoringDelegation: paperEntityName(delegation),
			documentNumber: 'WP/DRAFT'
		})
	);

	const saveFile = async (submit: boolean) => {
		if (!$formData.agendaItemId) {
			toast.error(m.paperAgendaItemRequired());
			return;
		}

		// Read the current snapshot from the resolution store
		const content = resolutionStore.snapshot;

		// Guard against empty content
		if (isResolutionEmpty(content)) {
			toast.error(m.paperContentRequired());
			return;
		}

		await createPaper(
			{
				conferenceId: params.conferenceId,
				authorId: currentUser.sub,
				delegationId: delegation.id,
				type: 'WORKING_PAPER',
				content,
				agendaItemId: $formData.agendaItemId
			},
			submit,
			() => {
				// Clear store so next paper creation starts fresh
				resetResolution();
				// Clear localStorage draft on successful submission
				draft.clear();
			}
		);
	};
</script>

<DraftRecoveryModal {draft} />

<NewPaperForm title={m.paperTypeWorkingPaper()} {form} onSave={saveFile}>
	{#snippet details()}
		<FormTextInput {form} name="delegation" disabled label={m.delegation()} />

		{#if $formData.committee}
			<FormTextInput {form} name="committee" disabled label={m.committee()} />
		{/if}
		<FormSelect name="agendaItemId" label={m.paperAgendaItem()} {form} options={agendaItems} />
	{/snippet}
	{#snippet editor()}
		{#key draft.editorKey}
			<PaperEditor.Resolution.ResolutionEditor
				committeeName={committee?.name ?? 'Committee'}
				editable
				headerData={resolutionHeaderData}
			/>
		{/key}
	{/snippet}
</NewPaperForm>
