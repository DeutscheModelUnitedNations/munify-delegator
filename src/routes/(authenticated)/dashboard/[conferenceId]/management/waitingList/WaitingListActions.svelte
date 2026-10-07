<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { m } from '$lib/paraglide/messages';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';

	interface Props {
		entryId: string;
		userId: string;
		conferenceId: string;
		hidden: boolean;
	}

	let { entryId, userId, conferenceId, hidden }: Props = $props();

	let isMutating = $state(false);
	let confirmingDelete = $state(false);

	async function toggleHidden() {
		if (isMutating) return;
		isMutating = true;
		const promise = client.mutate.updateWaitingListEntry({
			__args: { id: entryId, hidden: !hidden },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
		} catch {
			// handled by toast
		} finally {
			isMutating = false;
		}
	}

	async function deleteEntry() {
		if (isMutating) return;
		isMutating = true;
		const promise = Promise.resolve(
			client.mutate.deleteWaitingListEntry({ __args: { id: entryId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
		} catch {
			// handled by toast
		} finally {
			isMutating = false;
			confirmingDelete = false;
		}
	}
</script>

<div class="flex items-center gap-1">
	<a
		class="btn btn-primary btn-xs"
		href={resolve(`/dashboard/${conferenceId}/management/seats?assignUserId=${userId}`)}
		title={m.assignSeat()}
		onclick={(e) => e.stopPropagation()}
	>
		<i class="fa-solid fa-user-plus"></i>
	</a>
	<button
		class="btn btn-ghost btn-xs"
		title={hidden ? m.show() : m.hide()}
		onclick={(e) => {
			e.stopPropagation();
			toggleHidden();
		}}
	>
		{#if hidden}
			<i class="fa-duotone fa-eye"></i>
		{:else}
			<i class="fa-duotone fa-eye-slash"></i>
		{/if}
	</button>
	<button
		class="btn btn-ghost btn-error btn-xs"
		title={m.deleteEntry()}
		onclick={(e) => {
			e.stopPropagation();
			confirmingDelete = true;
		}}
	>
		<i class="fa-duotone fa-trash"></i>
	</button>
</div>

{#if confirmingDelete}
	<!-- The modal sits inside the table row, so keep its clicks from opening the user card. -->
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
	<div onclick={(e) => e.stopPropagation()}>
		<ConfirmDeleteModal
			title={m.deleteEntry()}
			text={m.areYouSure()}
			onConfirm={deleteEntry}
			onClose={() => (confirmingDelete = false)}
		/>
	</div>
{/if}
