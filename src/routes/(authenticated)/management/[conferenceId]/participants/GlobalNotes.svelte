<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
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

	const saveGlobalNotes = async () => {
		if (!id) return;
		const promise = client.mutate.updateUsersGlobalNotes({
			__args: { id, globalNotes: value },
			id: true,
			globalNotes: true
		});
		toast.promise(promise, {
			success: m.saved(),
			error: m.httpGenericError(),
			loading: m.saving()
		});
		await promise;
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
