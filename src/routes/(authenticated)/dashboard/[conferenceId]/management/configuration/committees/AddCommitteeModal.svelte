<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import CommitteeNameFields from './CommitteeNameFields.svelte';
	import SeatsPerDelegationField from './SeatsPerDelegationField.svelte';

	interface Props {
		conferenceId: string;
		open: boolean;
	}

	let { conferenceId, open = $bindable() }: Props = $props();

	let name = $state('');
	let abbreviation = $state('');
	let numOfSeatsPerDelegation = $state(1);

	const valid = $derived(!!name.trim() && !!abbreviation.trim() && numOfSeatsPerDelegation >= 1);

	async function create() {
		const promise = client.mutate.createCommittee({
			__args: {
				conferenceId,
				name: name.trim(),
				abbreviation: abbreviation.trim(),
				numOfSeatsPerDelegation
			},
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		open = false;
		name = '';
		abbreviation = '';
		numOfSeatsPerDelegation = 1;
	}
</script>

<Modal bind:open title={m.addCommittee()}>
	<CommitteeNameFields bind:name bind:abbreviation />
	<div class="flex flex-col gap-4">
		<SeatsPerDelegationField bind:seats={numOfSeatsPerDelegation} />
	</div>
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" disabled={!valid} onclick={create}>
			<i class="fa-solid fa-plus"></i>
			{m.create()}
		</button>
	{/snippet}
</Modal>
