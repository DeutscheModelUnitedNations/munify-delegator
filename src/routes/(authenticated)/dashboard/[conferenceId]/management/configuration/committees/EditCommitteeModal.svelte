<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import CommitteeNameFields from './CommitteeNameFields.svelte';
	import type { ManagedCommittee } from './types';

	interface Props {
		/** the committee to edit; the modal is open while it is set */
		committee: ManagedCommittee | undefined;
		canConfigure: boolean;
	}

	let { committee = $bindable(), canConfigure }: Props = $props();

	let draft = $state({ name: '', abbreviation: '', resolutionHeadline: '', seats: 1 });

	$effect.pre(() => {
		if (!committee) return;
		draft = {
			name: committee.name,
			abbreviation: committee.abbreviation,
			resolutionHeadline: committee.resolutionHeadline ?? '',
			seats: committee.numOfSeatsPerDelegation
		};
	});

	async function save(id: string) {
		const promise = client.mutate.updateCommittee({
			__args: {
				id,
				name: draft.name,
				abbreviation: draft.abbreviation,
				// an empty headline clears it
				resolutionHeadline: draft.resolutionHeadline || null,
				// only the management may change it, the server rejects it for everyone else
				numOfSeatsPerDelegation: canConfigure ? draft.seats : undefined
			},
			id: true
		});
		toast.promise(promise, {
			...genericPromiseToastMessages,
			error: (err) => (err instanceof Error ? err.message : null) || m.genericToastError()
		});
		await promise;
		committee = undefined;
	}
</script>

<Modal open={!!committee} title={m.editCommittee()} onclose={() => (committee = undefined)}>
	<div class="flex flex-col gap-4">
		<CommitteeNameFields bind:name={draft.name} bind:abbreviation={draft.abbreviation} />
		{#if canConfigure}
			<FormFieldset title={m.seatsPerDelegation()}>
				<input
					type="number"
					min="1"
					class="input w-full"
					aria-label={m.seatsPerDelegation()}
					bind:value={draft.seats}
				/>
				<p class="text-xs break-words whitespace-normal opacity-70">{m.seatsPerDelegationHint()}</p>
			</FormFieldset>
		{/if}
		<FormFieldset title={m.resolutionHeadline()}>
			<input
				class="input w-full"
				aria-label={m.resolutionHeadline()}
				placeholder={m.resolutionHeadlinePlaceholder()}
				bind:value={draft.resolutionHeadline}
			/>
			<p class="text-xs break-words whitespace-normal opacity-70">{m.resolutionHeadlineHint()}</p>
		</FormFieldset>
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (committee = undefined)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={() => committee && save(committee.id)}>
			{m.save()}
		</button>
	{/snippet}
</Modal>
