<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		/** the committee to delete; the modal is open while it is set */
		committee: { id: string; name: string } | undefined;
	}

	let { committee = $bindable() }: Props = $props();

	const DeleteCommitteeMutation = graphql(`
		mutation DeleteCommitteeMutation($id: String!) {
			deleteOneCommittee(where: { id: $id }) {
				id
			}
		}
	`);

	async function remove(id: string) {
		const promise = DeleteCommitteeMutation.mutate({ id });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		committee = undefined;
		cache.markStale();
		await invalidateAll();
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
