<script lang="ts">
	import { graphql } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import toast from 'svelte-french-toast';

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
		await toast.promise(
			saveGlobalNotesMutation.mutate({
				where: {
					id
				},
				globalNotes: value
			}),
			{
				success: m.saved(),
				error: m.httpGenericError(),
				loading: m.saving()
			}
		);

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
