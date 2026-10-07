<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { getDelegationApplication, splitDelegation, type Member } from './appData.svelte';

	interface Props {
		open: boolean;
		close: () => void;
		id: string | undefined;
	}
	import { draggable, droppable, type DragDropState } from '@thisux/sveltednd';
	import LoadingData from './components/LoadingData.svelte';
	import { dropMove, movedBetweenBuckets } from './dropRouting';
	import formatNames from '$lib/helpers/formatNames';

	let { open, close, id }: Props = $props();

	let buckets = $state<Member[][]>([[]]);

	let users = $state<{ id: string; givenName: string | null; familyName: string | null }[]>([]);
	let usersLoading = $state(false);
	let usersFailed = $state(false);

	$effect(() => {
		if (!id) return;
		const userIds = buckets.flat().map((member) => member.user.id);
		// An empty `in` list would compile to invalid SQL, so there is nothing to ask for.
		if (userIds.length === 0) {
			users = [];
			return;
		}
		usersLoading = true;
		usersFailed = false;
		void client.query
			.users({
				__args: { where: { id: { in: userIds } } },
				id: true,
				givenName: true,
				familyName: true
			})
			.then((result) => {
				users = result;
			})
			.catch(() => {
				usersFailed = true;
			})
			.finally(() => {
				usersLoading = false;
			});
	});

	const nameOf = (userId: string) => users.find((user) => user.id === userId);

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
		const move = dropMove(state);
		if (!id || !move) return;
		const member = getDelegationApplication(id)!.members.find((x) => x.user.id === move.itemId);
		if (member) buckets = movedBetweenBuckets(buckets, move, member);
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
			{#each buckets as bucket, i (i)}
				<div
					class="bg-base-200 flex flex-1 flex-col gap-2 rounded-lg p-4"
					use:droppable={{
						container: `bucket-${i}`,
						callbacks: {
							onDrop: handleDrop
						}
					}}
				>
					{#each bucket as member (member.id)}
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
									<LoadingData fetching={usersLoading} error={usersFailed}>
										{formatNames(
											nameOf(member.user.id)?.givenName ?? undefined,
											nameOf(member.user.id)?.familyName ?? undefined
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
