<script lang="ts">
	import { cache, graphql } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	interface Props {
		globalNotes: string;
		open: boolean;
		id?: string;
	}

	let { globalNotes, open = $bindable(false), id }: Props = $props();

	let value = $state(globalNotes);

	const saveGlobalNotesMutation = graphql(`
		mutation saveGlobalNotesMutation($where: UserWhereUniqueInput!, $globalNotes: String!) {
			updateOneUsersGlobalNotes(where: $where, globalNotes: $globalNotes) {
				id
				globalNotes
			}
		}
	`);

	const saveGlobalNotes = async () => {
		if (!id) return;
		const promise = saveGlobalNotesMutation.mutate({
			where: {
				id
			},
			globalNotes: value
		});
		toast.promise(promise, {
			success: m.saved(),
			error: m.httpGenericError(),
			loading: m.saving()
		});
		await promise;
		cache.markStale();
		await invalidateAll();

		open = false;
	};
</script>

<Modal bind:open title={m.globalNotes()}>
	<textarea class="textarea w-full" rows="8" bind:value></textarea>
	<button class="btn btn-primary mt-2" onclick={saveGlobalNotes}>
		<i class="fas fa-save"></i>
		{m.save()}
	</button>
</Modal>
