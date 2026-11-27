<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { withoutBlankPoints } from '#lib/schemata/discussionPoints';
	import AgendaItemFields from './AgendaItemFields.svelte';
	import type { AgendaItem } from './types';

	interface Props {
		/** the agenda item to edit; the modal is open while it is set */
		item: AgendaItem | undefined;
	}

	let { item = $bindable() }: Props = $props();

	let draft = $state<{ title: string; teaserText: string; discussionPoints: string[] }>({
		title: '',
		teaserText: '',
		discussionPoints: []
	});

	$effect.pre(() => {
		if (item) {
			draft = {
				title: item.title,
				teaserText: item.teaserText ?? '',
				discussionPoints: [...item.discussionPoints]
			};
		}
	});

	async function save(id: string) {
		const promise = client.mutate.updateAgendaItem({
			__args: {
				id,
				title: draft.title,
				teaserText: draft.teaserText,
				discussionPoints: withoutBlankPoints(draft.discussionPoints)
			},
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		item = undefined;
	}
</script>

<Modal open={!!item} title={m.editAgendaItem()} onclose={() => (item = undefined)}>
	<AgendaItemFields
		bind:title={draft.title}
		bind:teaserText={draft.teaserText}
		bind:discussionPoints={draft.discussionPoints}
	/>
	{#snippet action()}
		<button class="btn" onclick={() => (item = undefined)}>{m.cancel()}</button>
		<button class="btn btn-primary" onclick={() => item && save(item.id)}>{m.save()}</button>
	{/snippet}
</Modal>
