<!--
	@component
	A committee's name, abbreviation, seats per delegation and resolution headline, edited in place.
	Saving sends only what changed. While nothing is edited, the fields follow changes saved
	elsewhere; an edit in progress is kept.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import FormFieldset from '#lib/components/form/FormFieldset.svelte';
	import { m } from '#lib/paraglide/messages';
	import { errorToastMessage, genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import CommitteeNameFields from './CommitteeNameFields.svelte';
	import SeatsPerDelegationField from './SeatsPerDelegationField.svelte';
	import {
		committeeChanges,
		committeeDraftOf,
		committeeDraftValid,
		type CommitteeDraft
	} from './committeeChanges';
	import type { ManagedCommittee } from './types';

	interface Props {
		committee: ManagedCommittee;
		canEdit: boolean;
	}

	let { committee, canEdit }: Props = $props();

	const stored = $derived(committeeDraftOf(committee));
	/** What the fields started from: the stored values when they were last taken over. */
	let base = $state<CommitteeDraft>({
		name: '',
		abbreviation: '',
		resolutionHeadline: '',
		seats: 1
	});
	let draft = $state<CommitteeDraft>({
		name: '',
		abbreviation: '',
		resolutionHeadline: '',
		seats: 1
	});
	let saving = $state(false);

	const same = (a: CommitteeDraft, b: CommitteeDraft) => JSON.stringify(a) === JSON.stringify(b);

	// take over what was saved elsewhere, unless the fields hold an edit
	$effect.pre(() => {
		const next = stored;
		if (same(draft, base) && !same(next, base)) {
			base = { ...next };
			draft = { ...next };
		}
	});

	const changes = $derived(committeeChanges({ stored: committee, draft }));
	const valid = $derived(committeeDraftValid(draft));

	async function save() {
		if (!changes) return;
		saving = true;
		try {
			const promise = client.mutate.updateCommittee({
				__args: { id: committee.id, ...changes },
				id: true
			});
			toast.promise(promise, { ...genericPromiseToastMessages, error: errorToastMessage });
			await promise;
			base = { ...draft };
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
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="btn btn-primary btn-sm"
					disabled={!changes || !valid || saving}
					onclick={save}
				>
					<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
					{m.save()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					disabled={!changes || saving}
					onclick={() => {
						base = { ...stored };
						draft = { ...stored };
					}}
				>
					{m.discardChanges()}
				</button>
			</div>
		{/if}
	</fieldset>
</FormFieldset>
