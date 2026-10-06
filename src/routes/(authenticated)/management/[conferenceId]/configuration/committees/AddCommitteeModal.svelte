<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import CommitteeNameFields from './CommitteeNameFields.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		conferenceId: string;
		open: boolean;
	}

	let { conferenceId, open = $bindable() }: Props = $props();

	const CreateCommitteeMutation = graphql(`
		mutation CreateCommitteeMutation(
			$conferenceId: ID!
			$name: String!
			$abbreviation: String!
			$numOfSeatsPerDelegation: Int!
		) {
			createOneCommittee(
				conferenceId: $conferenceId
				name: $name
				abbreviation: $abbreviation
				numOfSeatsPerDelegation: $numOfSeatsPerDelegation
			) {
				id
			}
		}
	`);

	let name = $state('');
	let abbreviation = $state('');
	let numOfSeatsPerDelegation = $state(1);

	const valid = $derived(!!name.trim() && !!abbreviation.trim() && numOfSeatsPerDelegation >= 1);

	async function create() {
		const promise = CreateCommitteeMutation.mutate({
			conferenceId,
			name: name.trim(),
			abbreviation: abbreviation.trim(),
			numOfSeatsPerDelegation
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		open = false;
		name = '';
		abbreviation = '';
		numOfSeatsPerDelegation = 1;
		cache.markStale();
		await invalidateAll();
	}
</script>

<Modal bind:open title={m.addCommittee()}>
	<CommitteeNameFields bind:name bind:abbreviation />
	<FormFieldset title={m.seatsPerDelegation()}>
		<label class="floating-label">
			<span>{m.seatsPerDelegation()}</span>
			<input
				type="number"
				min="1"
				class="input w-full"
				placeholder={m.seatsPerDelegation()}
				bind:value={numOfSeatsPerDelegation}
			/>
		</label>
	</FormFieldset>
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" disabled={!valid} onclick={create}>
			<i class="fa-solid fa-plus"></i>
			{m.create()}
		</button>
	{/snippet}
</Modal>
