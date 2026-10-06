<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cache, graphql } from '$houdini';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';
	import type { AgendaItem } from './types';

	interface Props {
		/** the agenda item to edit; the modal is open while it is set */
		item: AgendaItem | undefined;
	}

	let { item = $bindable() }: Props = $props();

	const UpdateAgendaItemMutation = graphql(`
		mutation UpdateAgendaItemMutation($id: String!, $title: String!, $teaserText: String) {
			updateOneAgendaItem(
				where: { id: $id }
				data: { title: { set: $title }, teaserText: { set: $teaserText } }
			) {
				id
			}
		}
	`);

	let draft = $state({ title: '', teaserText: '' });

	$effect.pre(() => {
		if (item) draft = { title: item.title, teaserText: item.teaserText ?? '' };
	});

	async function save(id: string) {
		const promise = UpdateAgendaItemMutation.mutate({
			id,
			title: draft.title,
			teaserText: draft.teaserText || null
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		item = undefined;
		cache.markStale();
		await invalidateAll();
	}
</script>

<Modal open={!!item} title={m.editAgendaItem()} onclose={() => (item = undefined)}>
	<FormFieldset title={m.agendaItemDetails()}>
		<label class="floating-label">
			<span>{m.title()}</span>
			<input class="input w-full" placeholder={m.title()} bind:value={draft.title} />
		</label>
		<label class="floating-label">
			<span>{m.teaserText()}</span>
			<textarea class="textarea w-full" placeholder={m.teaserText()} bind:value={draft.teaserText}
			></textarea>
		</label>
	</FormFieldset>
	{#snippet action()}
		<button class="btn" onclick={() => (item = undefined)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={() => item && save(item.id)}>{m.save()}</button>
	{/snippet}
</Modal>
