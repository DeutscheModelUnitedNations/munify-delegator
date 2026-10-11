<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import type { AgendaItem } from './types';

	interface Props {
		/** the agenda item to delete; the modal is open while it is set */
		item: AgendaItem | undefined;
	}

	let { item = $bindable() }: Props = $props();

	let confirmText = $state('');

	$effect.pre(() => {
		if (item) confirmText = '';
	});

	// deleting an agenda item with papers has to be confirmed by typing its title
	const confirmed = $derived(!item || item.papers.length === 0 || confirmText === item.title);

	async function remove(id: string) {
		const promise = Promise.resolve(client.mutate.deleteAgendaItem({ __args: { id } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		item = undefined;
	}
</script>

<Modal open={!!item} title={m.deleteAgendaItem()} onclose={() => (item = undefined)}>
	{#if item && item.papers.length > 0}
		<div class="flex flex-col gap-4">
			<div class="alert alert-warning">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation flex-shrink-0"></i>
				<span class="break-words">{m.agendaItemHasPapers({ count: item.papers.length })}</span>
			</div>
			<FormFieldset title={m.confirmation()}>
				<p class="mb-2 break-words">{m.typeToConfirmDelete({ title: item.title })}</p>
				<input type="text" class="input w-full" placeholder={item.title} bind:value={confirmText} />
			</FormFieldset>
		</div>
	{:else if item}
		<p class="break-words">{m.confirmDeleteAgendaItem({ title: item.title })}</p>
	{/if}
	{#snippet action()}
		<button class="btn" onclick={() => (item = undefined)}>{m.cancel()}</button>
		<button class="btn btn-error" disabled={!confirmed} onclick={() => item && remove(item.id)}>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
