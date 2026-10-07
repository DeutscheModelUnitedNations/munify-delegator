<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		POOL_CONTAINER,
		boardState,
		roleContainer,
		singleDropAction
	} from '$lib/assignment/board';
	import { m } from '$lib/paraglide/messages';
	import type { DragDropState } from '@thisux/sveltednd';
	import { fetchAssignmentBoard, fetchAssignmentRoles } from '../board';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import { toastError } from '../toastError';
	import ConvertZone from './ConvertZone.svelte';
	import SingleCard from './SingleCard.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const [board, roles] = $derived(
		await Promise.all([
			fetchAssignmentBoard(params.conferenceId),
			fetchAssignmentRoles(params.conferenceId)
		])
	);
	const view = $derived(boardState(board, roles));

	let dragging = $state(false);

	const singleById = $derived(new Map(board.singleParticipants.map((s) => [s.id, s])));
	const pool = $derived(view.singles.filter((single) => !single.roleId));
	const converted = $derived(
		view.groups.flatMap((group) =>
			group.singleParticipantId
				? [
						{
							singleParticipantId: group.singleParticipantId,
							single: singleById.get(group.singleParticipantId)
						}
					]
				: []
		)
	);
	const holdersOf = (roleId: string) => view.singles.filter((single) => single.roleId === roleId);

	function onDrop(dropState: DragDropState<{ id: string }>) {
		dragging = false;
		const singleParticipantId = dropState.draggedItem.id;
		const action = singleDropAction(dropState.sourceContainer, dropState.targetContainer);
		if (!action) return;
		const mutation =
			action.type === 'convert'
				? client.mutate.convertSingleParticipant({ __args: { singleParticipantId } })
				: client.mutate.assignSingleParticipantRole({
						__args: { singleParticipantId, roleId: action.roleId }
					});
		void Promise.resolve(mutation).catch(toastError);
	}

	const revert = (singleParticipantId: string) =>
		Promise.resolve(
			client.mutate.revertSingleParticipantConversion({ __args: { singleParticipantId } })
		).catch(toastError);
</script>

{#snippet singleCard(single: (typeof view.singles)[number], container: string)}
	<SingleCard
		singleParticipantId={single.singleParticipantId}
		single={singleById.get(single.singleParticipantId)}
		review={view.reviewOf({ delegationId: null, singleParticipantId: single.singleParticipantId })}
		pending={single.pending}
		{container}
		onDragChange={(isDragging) => (dragging = isDragging)}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="alert alert-info alert-soft">
		<i class="fa-duotone fa-user-tie text-xl"></i>
		<p>{m.assignmentSinglesHint()}</p>
	</div>

	<div class="flex flex-col gap-4 xl:flex-row">
		<div class="flex flex-col gap-4 xl:w-96 xl:shrink-0">
			<PoolSection container={POOL_CONTAINER} count={pool.length} {onDrop}>
				{#each pool as single (single.singleParticipantId)}
					{@render singleCard(single, POOL_CONTAINER)}
				{/each}
			</PoolSection>
			<ConvertZone {converted} highlight={dragging} {onDrop} onRevert={revert} />
		</div>

		<section class="flex grow flex-wrap content-start gap-3" aria-label={m.assignmentRoles()}>
			{#each roles.customRoles as role (role.id)}
				{@const holders = holdersOf(role.id)}
				<RoleCard
					container={roleContainer(role.id)}
					title={role.name}
					icon={role.fontAwesomeIcon ?? undefined}
					seats={role.seatAmount}
					taken={holders.length}
					highlight={dragging && holders.length < role.seatAmount}
					{onDrop}
				>
					{#each holders as single (single.singleParticipantId)}
						{@render singleCard(single, roleContainer(role.id))}
					{/each}
				</RoleCard>
			{:else}
				<p class="text-base-content/60 w-full py-12 text-center">{m.assignmentNoCustomRoles()}</p>
			{/each}
		</section>
	</div>
</div>
