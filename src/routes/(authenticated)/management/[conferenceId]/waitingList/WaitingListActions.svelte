<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		entryId: string;
		userId: string;
		conferenceId: string;
		hidden: boolean;
	}

	let { entryId, userId, conferenceId, hidden }: Props = $props();

	let isMutating = $state(false);

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
			await invalidateAll();
			isMutating = false;
		}
	}

	async function deleteEntry() {
		if (isMutating) return;
		if (!confirm(m.areYouSure())) return;
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
			await invalidateAll();
			isMutating = false;
		}
	}
</script>

<div class="flex items-center gap-1">
	<button
		class="btn btn-ghost btn-xs"
		title={m.adminUserCard()}
		onclick={(e) => {
			e.stopPropagation();
			openUserCard(userId, conferenceId);
		}}
	>
		<i class="fa-duotone fa-id-card"></i>
	</button>
	<a
		class="btn btn-primary btn-xs"
		href="/management/{conferenceId}/seats?assignUserId={userId}"
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
			deleteEntry();
		}}
	>
		<i class="fa-duotone fa-trash"></i>
	</button>
</div>
