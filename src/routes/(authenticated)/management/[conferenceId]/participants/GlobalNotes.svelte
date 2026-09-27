<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	interface Props {
		globalNotes: string;
		open: boolean;
		id?: string;
		/** Called once the note is stored, so the caller can reload what it shows. */
		onSaved?: () => void;
	}

	let { globalNotes, open = $bindable(false), id, onSaved }: Props = $props();

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

		open = false;
		onSaved?.();
	};
</script>

<Modal bind:open title={m.globalNotes()}>
	<textarea class="textarea w-full" rows="8" bind:value></textarea>
	<button class="btn btn-primary mt-2" onclick={saveGlobalNotes}>
		<i class="fas fa-save"></i>
		{m.save()}
	</button>
</Modal>
