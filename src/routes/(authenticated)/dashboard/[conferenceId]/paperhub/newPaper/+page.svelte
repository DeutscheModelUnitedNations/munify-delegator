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
	import { onMount } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { browser } from '$app/environment';
	import { persisted } from 'svelte-persisted-store';
	import { get } from 'svelte/store';

	// Types for draft persistence (Position/Introduction Papers only)
	interface PaperDraft {
		type: 'POSITION_PAPER' | 'INTRODUCTION_PAPER';
		agendaItemId?: string;
		content: unknown;
		savedAt: number;
	}

	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

	// State for recovery modal
	let showRecoveryModal = $state(false);
	let savedDraft: PaperDraft | null = $state(null);
	// Key to force editor remount when restoring draft
	let editorKey = $state(0);

	// Helper to format relative time
	function formatRelativeTime(timestamp: number | undefined): string {
		if (!timestamp) return '';
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return m.timeAgoSeconds({ count: seconds });
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return m.timeAgoMinutes({ count: minutes });
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return m.timeAgoHours({ count: hours });
		const days = Math.floor(hours / 24);
		return m.timeAgoDays({ count: days });
	}

	// Types for draft persistence (Position/Introduction Papers only)
	interface PaperDraft {
		type: 'POSITION_PAPER' | 'INTRODUCTION_PAPER';
		agendaItemId?: string;
		content: unknown;
		savedAt: number;
	}

	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

	// State for recovery modal
	let showRecoveryModal = $state(false);
	let savedDraft: PaperDraft | null = $state(null);
	// Key to force editor remount when restoring draft
	let editorKey = $state(0);

	// Helper to format relative time
	function formatRelativeTime(timestamp: number | undefined): string {
		if (!timestamp) return '';
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return m.timeAgoSeconds({ count: seconds });
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return m.timeAgoMinutes({ count: minutes });
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return m.timeAgoHours({ count: hours });
		const days = Math.floor(hours / 24);
		return m.timeAgoDays({ count: days });
	}

	let { data }: { data: PageData } = $props();

	// Create persisted store for this conference's paper draft (only on browser)
	const draftStore = browser
		? persisted<PaperDraft | null>(`paperDraft_${data.conferenceId}`, null)
		: null;

	// Check for existing draft SYNCHRONOUSLY before render
	// This must happen BEFORE child components mount
	if (browser && draftStore) {
		const storedDraft = get(draftStore);
		if (storedDraft) {
			// Check if draft is expired (older than 7 days)
			if (Date.now() - storedDraft.savedAt > SEVEN_DAYS_MS) {
				draftStore.set(null);
				$editorContentStore = undefined;
			} else {
				// Valid draft found - set state for modal
				savedDraft = storedDraft;
				showRecoveryModal = true;
			}
		} else {
			// No draft - clear store before editor mounts
			$editorContentStore = undefined;
		}
	} else {
		// SSR or no draftStore - clear store
		$editorContentStore = undefined;
	}

	// Recovery functions
	function restoreDraft() {
		if (savedDraft) {
			// Set form data
			$formData.type = savedDraft.type;
			if (savedDraft.agendaItemId) {
				$formData.agendaItemId = savedDraft.agendaItemId;
			}
			// Set content to the editor store
			$editorContentStore = savedDraft.content as any;
			// Increment key to force editor remount with new content
			editorKey++;
		}
		showRecoveryModal = false;
	}

	function startFresh() {
		if (draftStore) {
			draftStore.set(null);
		}
		$editorContentStore = undefined;
		// Increment key to force editor remount with cleared content
		editorKey++;
		showRecoveryModal = false;
	}

	// Auto-save: Use interval-based polling for TipTap content
	let saveInterval: ReturnType<typeof setInterval>;
	let lastSavedContent: string | null = null;

	// Function to save current content to localStorage
	function saveCurrentDraft() {
		if (!browser || !draftStore || showRecoveryModal) return;

		// Read form data for current paper type
		const currentFormData = get(form.form);
		const paperType = currentFormData.type as 'POSITION_PAPER' | 'INTRODUCTION_PAPER';

		// Use get() to explicitly read current store value
		const rawContent = get(editorContentStore);

		if (rawContent === undefined) {
			return;
		}

		// Stringify to create a plain JSON snapshot
		let contentString: string;
		try {
			contentString = JSON.stringify(rawContent);
		} catch (e) {
			return;
		}

		// Skip if content hasn't changed
		if (contentString === lastSavedContent) {
			return;
		}
		lastSavedContent = contentString;

		draftStore.set({
			type: paperType,
			agendaItemId: currentFormData.agendaItemId,
			content: JSON.parse(contentString),
			savedAt: Date.now()
		});
	}

	// Set up auto-save interval when component mounts
	onMount(() => {
		if (!browser || !draftStore) return;

		// Poll every second for changes
		saveInterval = setInterval(() => {
			if (!showRecoveryModal) {
				saveCurrentDraft();
			}
		}, 1000);

		return () => {
			if (saveInterval) clearInterval(saveInterval);
		};
	});

	// Safety net: save on page unload
	$effect(() => {
		if (!browser || !draftStore) return;

		const handleBeforeUnload = () => {
			saveCurrentDraft();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	// Create persisted store for this conference's paper draft (only on browser)
	const draftStore = browser
		? persisted<PaperDraft | null>(`paperDraft_${data.conferenceId}`, null)
		: null;

	// Check for existing draft SYNCHRONOUSLY before render
	// This must happen BEFORE child components mount
	if (browser && draftStore) {
		const storedDraft = get(draftStore);
		if (storedDraft) {
			// Check if draft is expired (older than 7 days)
			if (Date.now() - storedDraft.savedAt > SEVEN_DAYS_MS) {
				draftStore.set(null);
				$editorContentStore = undefined;
			} else {
				// Valid draft found - set state for modal
				savedDraft = storedDraft;
				showRecoveryModal = true;
			}
		} else {
			// No draft - clear store before editor mounts
			$editorContentStore = undefined;
		}
	} else {
		// SSR or no draftStore - clear store
		$editorContentStore = undefined;
	}

	// Recovery functions
	function restoreDraft() {
		if (savedDraft) {
			// Set form data
			$formData.type = savedDraft.type;
			if (savedDraft.agendaItemId) {
				$formData.agendaItemId = savedDraft.agendaItemId;
			}
			// Set content to the editor store
			$editorContentStore = savedDraft.content as any;
			// Increment key to force editor remount with new content
			editorKey++;
		}
		showRecoveryModal = false;
	}

	function startFresh() {
		if (draftStore) {
			draftStore.set(null);
		}
		$editorContentStore = undefined;
		// Increment key to force editor remount with cleared content
		editorKey++;
		showRecoveryModal = false;
	}

	// Auto-save: Use interval-based polling for TipTap content
	let saveInterval: ReturnType<typeof setInterval>;
	let lastSavedContent: string | null = null;

	// Function to save current content to localStorage
	function saveCurrentDraft() {
		if (!browser || !draftStore || showRecoveryModal) return;

		// Read form data for current paper type
		const currentFormData = get(form.form);
		const paperType = currentFormData.type as 'POSITION_PAPER' | 'INTRODUCTION_PAPER';

		// Use get() to explicitly read current store value
		const rawContent = get(editorContentStore);

		if (rawContent === undefined) {
			return;
		}

		// Stringify to create a plain JSON snapshot
		let contentString: string;
		try {
			contentString = JSON.stringify(rawContent);
		} catch (e) {
			return;
		}

		// Skip if content hasn't changed
		if (contentString === lastSavedContent) {
			return;
		}
		lastSavedContent = contentString;

		draftStore.set({
			type: paperType,
			agendaItemId: currentFormData.agendaItemId,
			content: JSON.parse(contentString),
			savedAt: Date.now()
		});
	}

	// Set up auto-save interval when component mounts
	onMount(() => {
		if (!browser || !draftStore) return;

		// Poll every second for changes
		saveInterval = setInterval(() => {
			if (!showRecoveryModal) {
				saveCurrentDraft();
			}
		}, 1000);

		return () => {
			if (saveInterval) clearInterval(saveInterval);
		};
	});

	// Safety net: save on page unload
	$effect(() => {
		if (!browser || !draftStore) return;

		const handleBeforeUnload = () => {
			saveCurrentDraft();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

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
			return [{ value: 'POSITION_PAPER', label: m.paperTypePositionPaper() }];
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

		// Use TipTap editor content store
		const content = $editorContentStore;

		// Guard against undefined content
		if (content === undefined) {
			toast.error(m.paperContentRequired());
			return;
		}

		const response = await toast.promise(
			createPaperMutation.mutate({
				conferenceId: data.conferenceId,
				userId: data.user.sub,
				delegationId: delegation?.id,
				type: $formData.type,
				content,
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

		if (response?.data.createOnePaper?.id) {
			// Clear store so next paper creation starts fresh
			$editorContentStore = undefined;
			// Clear localStorage draft on successful submission
			if (draftStore) {
				draftStore.set(null);
			}
			goto(`/dashboard/${data.conferenceId}/paperhub`);
		}
	};
</script>

<!-- Draft Recovery Modal -->
<Modal bind:open={showRecoveryModal} title={m.paperDraftRecoveryTitle()}>
	<p class="mb-2">{m.paperDraftRecoveryMessage()}</p>
	<p class="text-sm text-base-content/70">
		{m.paperDraftSavedAgo({ time: formatRelativeTime(savedDraft?.savedAt) })}
	</p>
	{#snippet action()}
		<button class="btn" onclick={startFresh}>{m.paperStartFresh()}</button>
		<button class="btn btn-primary" onclick={restoreDraft}>{m.paperRestoreDraft()}</button>
	{/snippet}
</Modal>

<div class="flex flex-col gap-2 w-full">
	<h2 class="text-2xl font-bold">{m.newPaper()}</h2>

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
		{#key editorKey}
			<PaperEditor.PaperFormat editable />
		{/key}
	</Form>
</div>
