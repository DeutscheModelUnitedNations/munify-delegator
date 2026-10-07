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
	import { toast } from 'svelte-sonner';
	import { fetchAssignmentBoard, fetchAssignmentRoles } from '../board';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import { toastError } from '../toastError';
	import ConvertZone from './ConvertZone.svelte';
	import SingleCard from './SingleCard.svelte';
	import VirtualList from 'svelte-virtual-list';
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
	let busy = $state(false);

	async function autoAssign() {
		busy = true;
		await Promise.resolve(
			client.mutate.autoAssignSingleParticipants({ __args: { conferenceId: params.conferenceId } })
		)
			.then((assigned) => toast.success(m.assignmentSinglesAutoAssigned({ count: assigned })))
			.catch(toastError);
		busy = false;
	}

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
	/** None of the applicant's wishes is the role they hold, as `SingleCard` flags it. */
	const isBadFit = (singleParticipantId: string, roleId: string) =>
		!singleById.get(singleParticipantId)?.appliedForRoles.some((role) => role.id === roleId);
	/** The holders of a role, those that did not wish for it first so misfits are seen at once. */
	const holdersOf = (roleId: string) =>
		view.singles
			.filter((single) => single.roleId === roleId)
			.toSorted(
				(a, b) =>
					Number(isBadFit(b.singleParticipantId, roleId)) -
					Number(isBadFit(a.singleParticipantId, roleId))
			);

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

{#snippet singleCard(single: (typeof view.singles)[number], container: string, fluid = false)}
	<SingleCard
		singleParticipantId={single.singleParticipantId}
		single={singleById.get(single.singleParticipantId)}
		review={view.reviewOf({ delegationId: null, singleParticipantId: single.singleParticipantId })}
		pending={single.pending}
		roleId={single.roleId}
		{container}
		onDragChange={(isDragging) => (dragging = isDragging)}
		conferenceId={params.conferenceId}
		{fluid}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="alert alert-info alert-soft">
		<i class="fa-duotone fa-user-tie text-xl"></i>
		<p>{m.assignmentSinglesHint()}</p>
		<button
			class="btn btn-primary btn-sm"
			disabled={busy || pool.length === 0}
			onclick={autoAssign}
		>
			<i class="fa-duotone fa-wand-magic-sparkles"></i>
			{m.assignmentAutoAssignSingles()}
		</button>
	</div>

	<div class="flex flex-col gap-4 xl:flex-row">
		<div class="flex flex-col gap-4 xl:w-96 xl:shrink-0">
			<PoolSection container={POOL_CONTAINER} count={pool.length} virtual {onDrop}>
				<!-- Only the rows in view are in the DOM; the pool can hold hundreds of applicants. -->
				<VirtualList items={pool} height="max(16rem, calc(100vh - 36rem))" let:item={single}>
					<div class="pb-2">
						{@render singleCard(single, POOL_CONTAINER, true)}
					</div>
				</VirtualList>
			</PoolSection>
			<ConvertZone {converted} highlight={dragging} {onDrop} onRevert={revert} />
		</div>

		<section
			class="grid grow grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] content-start items-start gap-3"
			aria-label={m.assignmentRoles()}
		>
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
					{#snippet children(listHeight)}
						<VirtualList items={holders} height={listHeight} let:item={single}>
							<div class="pb-2">
								{@render singleCard(single, roleContainer(role.id), true)}
							</div>
						</VirtualList>
					{/snippet}
				</RoleCard>
			{:else}
				<p class="text-base-content/60 w-full py-12 text-center">{m.assignmentNoCustomRoles()}</p>
			{/each}
		</section>
	</div>
</div>
