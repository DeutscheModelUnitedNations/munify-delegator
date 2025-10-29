<script lang="ts">
	import { graphql } from '$houdini';
	import { getDelegationApplication, splitDelegation, type Member } from './appData.svelte';

	interface Props {
		open: boolean;
		close: () => void;
		id: string | undefined;
	}
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import LoadingData from './components/LoadingData.svelte';
	import formatNames from '$lib/services/formatNames';

	let { open, close, id }: Props = $props();

	let buckets = $state<Member[][]>([[]]);

	const getUserDetailsQuery = graphql(`
		query GetUserDetailsForPartition($userId: [String!]) {
			findManyUsers(where: { id: { in: $userId } }) {
				id
				given_name
				family_name
				gender
				birthday
				globalNotes
				conferenceParticipationsCount
			}
		}
	`);

	$effect(() => {
		if (!id) return;
		getUserDetailsQuery.fetch({
			variables: {
				userIds: buckets.flat().map((x) => x.user.id)
			}
		});
	});

	$effect(() => {
		if (!id) {
			buckets = [[]];
			return;
		}
		const members = getDelegationApplication(id)?.members;
		if (!members) return;
		buckets = [[...getDelegationApplication(id)!.members]];
	});

	const handleDrop = (state: DragDropState<{ id: string }>) => {
		if (!id) return;
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer || !draggedItem.id) return;
		if (sourceContainer === targetContainer) return;
		const sourceBucket = parseInt(sourceContainer.split('-')[1]);
		const targetBucket = parseInt(targetContainer.split('-')[1]);
		const member = getDelegationApplication(id)!.members.find((x) => x.user.id === draggedItem.id);

		if (!member) return;
		buckets[sourceBucket] = buckets[sourceBucket].filter((x) => x.user.id !== draggedItem.id);
		buckets[targetBucket] = [...buckets[targetBucket], member];
	};

	const apply = () => {
		if (!id) return;
		splitDelegation(id, buckets);
		close();
	};
</script>

<div class="modal {open && 'modal-open'} w-full">
	<div class="modal-box w-11/12 max-w-5xl">
		<h3 class="text-lg font-bold">Zerteilen</h3>
		<div class="flex gap-2 p-4">
			{#each buckets as bucket, i}
				<div
					class="bg-base-200 flex flex-1 flex-col gap-2 rounded-lg p-4"
					use:droppable={{
						container: `bucket-${i}`,
						callbacks: {
							onDrop: handleDrop
						}
					}}
				>
					{#each bucket as member}
						<div class="flex items-center gap-2">
							<div
								class="bg-base-300 flex cursor-grab items-center gap-2 rounded-md p-2 shadow-md"
								use:draggable={{
									container: `bucket-${i}`,
									dragData: { id: member.user.id }
								}}
							>
								<i class="fas fa-grip-dots"></i>
								<p>
									<LoadingData
										fetching={$getUserDetailsQuery.fetching}
										error={$getUserDetailsQuery.error}
									>
										{formatNames(
											$getUserDetailsQuery.data?.findManyUsers.find((u) => u.id === member.user.id)
												?.given_name,
											$getUserDetailsQuery.data?.findManyUsers.find((u) => u.id === member.user.id)
												?.family_name
										)}
									</LoadingData>
									{#if member.isHeadDelegate}
										<i class="fa-duotone fa-medal ml-2"></i>
									{/if}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/each}
			<button
				class="border-base-200 hover:bg-base-200 flex h-full min-h-[100px] w-full flex-1 items-center justify-center rounded-lg border-4 border-dashed"
				aria-label="Add new bucket"
				onclick={() => {
					buckets = [...buckets, []];
				}}
			>
				<i class="fa-duotone fa-plus text-3xl"></i>
			</button>
		</div>
		<div class="flex justify-end gap-2">
			<button class="btn btn-ghost" onclick={close}>Abbrechen</button>
			<button class="btn btn-primary" onclick={apply}>Ausführen</button>
		</div>
	</div>
	<button class="modal-backdrop" onclick={close} aria-label="Exit"></button>
</div>
