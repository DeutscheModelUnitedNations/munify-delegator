<!--
	@component
	A committee's name, abbreviation, seats per delegation and resolution headline, edited in place.
	Saving sends only what changed. While nothing is edited, the fields follow changes saved
	elsewhere; an edit in progress is kept.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import { m } from '#lib/paraglide/messages';
	import { errorToastMessage, genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import CommitteeNameFields from './CommitteeNameFields.svelte';
	import SaveDiscardButtons from './SaveDiscardButtons.svelte';
	import SeatsPerDelegationField from './SeatsPerDelegationField.svelte';
	import {
		committeeChanges,
		committeeDraftOf,
		committeeDraftValid,
		type CommitteeDraft
	} from './committeeChanges';
	import { takeOverStored } from './inlineDraft';
	import type { ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		canEdit: boolean;
	}

	let { committee, canEdit }: Props = $props();

	const stored = $derived(committeeDraftOf(committee));
	// Seeded from the stored values right away (effects do not run while rendering on the server);
	// the effect below only takes over later changes.
	/** What the fields started from: the stored values when they were last taken over. */
	let base = $state<CommitteeDraft>(untrack(() => committeeDraftOf(committee)));
	let draft = $state<CommitteeDraft>(untrack(() => committeeDraftOf(committee)));
	let saving = $state(false);
	/** The stored values from before the last save, ignored until newer ones arrive. */
	let stale = $state<CommitteeDraft>();

	// take over what was saved elsewhere, unless the fields hold an edit (`takeOverStored`)
	$effect.pre(() => {
		const next = takeOverStored({ draft, base, next: stored, stale, saving });
		if (next) {
			base = { ...next };
			draft = { ...next };
		}
	});

	const changes = $derived(committeeChanges({ base, draft }));
	const valid = $derived(committeeDraftValid(draft));

	async function save() {
		if (!changes) return;
		saving = true;
		// what is sent becomes the base: fields edited while saving stay edits
		const submitted = { ...draft };
		const before = { ...stored };
		try {
			const promise = client.mutate.updateCommittee({
				__args: { id: committee.id, ...changes },
				id: true
			});
			toast.promise(promise, { ...genericPromiseToastMessages, error: errorToastMessage });
			await promise;
			stale = before;
			base = submitted;
		} catch {
			// the toast shows what went wrong; the fields keep the edit
		} finally {
			saving = false;
		}
	}
</script>

<FormFieldset title={m.committeeSettings()}>
	<fieldset class="flex flex-col gap-4" disabled={!canEdit} data-tour="team.committees.settings">
		<div class="grid gap-4 md:grid-cols-2">
			<CommitteeNameFields bind:name={draft.name} bind:abbreviation={draft.abbreviation} />
			<div class="flex flex-col gap-4">
				<SeatsPerDelegationField bind:seats={draft.seats} />
				<label class="floating-label">
					<span>{m.resolutionHeadline()}</span>
					<input
						class="input w-full"
						placeholder={m.resolutionHeadlinePlaceholder()}
						bind:value={draft.resolutionHeadline}
					/>
				</label>
			</div>
		</div>
		<p class="text-xs break-words whitespace-normal opacity-70">
			{m.seatsPerDelegationHint()}
			{m.resolutionHeadlineHint()}
		</p>
		{#if canEdit}
			<SaveDiscardButtons
				changed={!!changes}
				{valid}
				{saving}
				onSave={save}
				onDiscard={() => {
					base = { ...stored };
					draft = { ...stored };
				}}
			/>
		{/if}
	</fieldset>
</FormFieldset>
