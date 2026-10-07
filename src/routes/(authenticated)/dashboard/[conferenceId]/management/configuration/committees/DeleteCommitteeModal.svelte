<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		/** the committee to delete; the modal is open while it is set */
		committee: { id: string; name: string } | undefined;
	}

	let { committee = $bindable() }: Props = $props();

	async function remove(id: string) {
		const promise = Promise.resolve(client.mutate.deleteCommittee({ __args: { id } }));
		toast.promise(promise, {
			...genericPromiseToastMessages,
			error: (err) => (err instanceof Error ? err.message : null) || m.genericToastError()
		});
		await promise;
		committee = undefined;
	}
</script>

<Modal open={!!committee} title={m.deleteCommittee()} onclose={() => (committee = undefined)}>
	{#if committee}
		<p class="break-words">{m.committeeDeleteConfirm({ name: committee.name })}</p>
	{/if}
	{#snippet action()}
		<button class="btn" onclick={() => (committee = undefined)}>{m.cancel()}</button>
		<button class="btn btn-error" onclick={() => committee && remove(committee.id)}>
			<i class="fa-solid fa-trash"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
