<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import AgendaItemFields from './AgendaItemFields.svelte';
	import type { AgendaItem } from './types';

	interface Props {
		/** the agenda item to edit; the modal is open while it is set */
		item: AgendaItem | undefined;
	}

	let { item = $bindable() }: Props = $props();

	let draft = $state({ title: '', teaserText: '' });

	$effect.pre(() => {
		if (item) draft = { title: item.title, teaserText: item.teaserText ?? '' };
	});

	async function save(id: string) {
		const promise = client.mutate.updateAgendaItem({
			__args: { id, title: draft.title, teaserText: draft.teaserText },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		item = undefined;
	}
</script>

<Modal open={!!item} title={m.editAgendaItem()} onclose={() => (item = undefined)}>
	<AgendaItemFields bind:title={draft.title} bind:teaserText={draft.teaserText} />
	{#snippet action()}
		<button class="btn" onclick={() => (item = undefined)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={() => item && save(item.id)}>{m.save()}</button>
	{/snippet}
</Modal>
