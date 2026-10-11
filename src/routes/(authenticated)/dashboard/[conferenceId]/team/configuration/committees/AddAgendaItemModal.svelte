<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import AgendaItemFields from './AgendaItemFields.svelte';
	import type { ManagedCommittee } from './types';

	interface Props {
		/** the committee to add an agenda item to; the modal is open while it is set */
		committee: ManagedCommittee | undefined;
	}

	let { committee = $bindable() }: Props = $props();

	let title = $state('');
	let teaserText = $state('');

	const valid = $derived(!!title.trim());

	async function create(committeeId: string) {
		const promise = client.mutate.createAgendaItem({
			__args: {
				committeeId,
				title: title.trim(),
				teaserText: teaserText.trim() || undefined
			},
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		committee = undefined;
		title = '';
		teaserText = '';
	}
</script>

<Modal
	open={!!committee}
	title={committee ? `${m.createNewAgendaItem()} (${committee.abbreviation})` : ''}
	onclose={() => (committee = undefined)}
>
	<AgendaItemFields bind:title bind:teaserText />
	{#snippet action()}
		<button class="btn" onclick={() => (committee = undefined)}>{m.cancel()}</button>
		<button
			class="btn btn-primary"
			disabled={!valid}
			onclick={() => committee && create(committee.id)}
		>
			<i class="fa-sharp-duotone fa-solid fa-plus"></i>
			{m.create()}
		</button>
	{/snippet}
</Modal>
