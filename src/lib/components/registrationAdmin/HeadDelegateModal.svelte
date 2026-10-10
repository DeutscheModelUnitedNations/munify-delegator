<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { untrack } from 'svelte';

	interface Member {
		id: string;
		isHeadDelegate: boolean;
		user: { id: string; givenName: string | null; familyName: string | null };
	}

	interface Props {
		open: boolean;
		delegationId: string;
		members: Member[];
	}

	let { open = $bindable(false), delegationId, members }: Props = $props();

	let selectedMemberId = $state<string | null>(null);
	let isUpdating = $state(false);

	const selectedMember = $derived(members.find((member) => member.id === selectedMemberId));

	// Every time the picker opens it starts from whoever leads the delegation right now.
	$effect(() => {
		if (!open) return;
		selectedMemberId = untrack(() => members.find((member) => member.isHeadDelegate)?.id ?? null);
	});

	function close() {
		selectedMemberId = null;
		open = false;
	}

	async function confirmHeadDelegate() {
		if (!selectedMember || selectedMember.isHeadDelegate) return;
		isUpdating = true;
		try {
			await client.mutate.updateDelegation({
				__args: { id: delegationId, newHeadDelegateUserId: selectedMember.user.id },
				id: true,
				members: { id: true, isHeadDelegate: true }
			});
		} catch (error) {
			console.error('Failed to update head delegate:', error);
		} finally {
			isUpdating = false;
			close();
		}
	}
</script>

<div class="modal" class:modal-open={open}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{m.headDelegate()}</h3>
		<div class="max-h-60 overflow-y-auto">
			{#each members as member (member.id)}
				<label class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded-field p-2">
					<input
						type="radio"
						name="head-delegate"
						checked={selectedMemberId === member.id}
						onclick={() => (selectedMemberId = member.id)}
						disabled={member.isHeadDelegate || isUpdating}
						class="radio"
					/>
					<span>{member.user.givenName} {member.user.familyName}</span>
					{#if member.isHeadDelegate}
						<span class="badge badge-accent">
							<i class="fa-sharp-duotone fa-solid fa-medal"></i>
						</span>
					{/if}
				</label>
			{/each}
		</div>
		<div class="modal-action">
			<button class="btn" onclick={close} disabled={isUpdating}>{m.close()}</button>
			<button
				class="btn btn-primary"
				onclick={confirmHeadDelegate}
				disabled={!selectedMember || selectedMember.isHeadDelegate || isUpdating}
			>
				{#if isUpdating}
					<span class="loading loading-spinner"></span>
				{/if}
				{m.confirm()}
			</button>
		</div>
	</div>
</div>
