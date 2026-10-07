<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		POOL_CONTAINER,
		boardState,
		describeRole,
		dropAction,
		freeSeats,
		hasRole,
		pickSize,
		poolGroups,
		roleContainer,
		rolesWithSeats,
		sizeOptions
	} from '$lib/assignment/board';
	import type { AssignmentGroup } from '$lib/assignment/state';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { DragDropState } from '@thisux/sveltednd';
	import { toast } from 'svelte-sonner';
	import { queryParameters, ssp } from 'sveltekit-search-params';
	import { assignGroup } from '../assignGroup';
	import { fetchAssignmentBoard, fetchAssignmentRoles, type BoardDelegation } from '../board';
	import BoardToolbar from '../BoardToolbar.svelte';
	import GroupCard from '../GroupCard.svelte';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import SplitModal from '../SplitModal.svelte';
	import { toastError } from '../toastError';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const [board, roles] = $derived(
		await Promise.all([
			fetchAssignmentBoard(routeParams.conferenceId),
			fetchAssignmentRoles(routeParams.conferenceId)
		])
	);
	const view = $derived(boardState(board, roles));

	const params = queryParameters({
		size: ssp.number(0),
		seats: ssp.number(0),
		disqualified: ssp.boolean(false)
	});

	let dragging = $state<AssignmentGroup | undefined>();
	let splitting = $state<BoardDelegation | undefined>();
	let busy = $state(false);

	const delegationById = $derived(new Map(board.delegations.map((d) => [d.id, d])));
	const singleById = $derived(new Map(board.singleParticipants.map((s) => [s.id, s])));

	const options = $derived(sizeOptions(view));
	const size = $derived(pickSize(options, params.size ?? 0));
	// 0 follows the group size.
	const seats = $derived(params.seats || size);
	const pool = $derived(poolGroups(view, size, !!params.disqualified));
	const shownRoles = $derived(
		rolesWithSeats(view, seats)
			.map((role) => ({
				...role,
				...describeRole(role.target, roles, getFullTranslatedCountryNameFromISO3Code)
			}))
			.sort((a, b) => a.title.localeCompare(b.title))
	);

	function onDrop(dropState: DragDropState<{ id: string }>) {
		dragging = undefined;
		const action = dropAction(
			view,
			dropState.draggedItem.id,
			dropState.sourceContainer,
			dropState.targetContainer
		);
		if (!action) return;
		if (action.type === 'full') toast.error(m.assignmentNotEnoughSeats());
		else void assignGroup(action.group, action.target);
	}

	async function run(action: () => Promise<unknown>) {
		busy = true;
		await action().catch(toastError);
		busy = false;
	}

	const autoAssign = () =>
		run(async () => {
			const assigned = await client.mutate.autoAssignDelegations({
				__args: { conferenceId: routeParams.conferenceId, size }
			});
			toast.success(m.assignmentAutoAssigned({ count: assigned }));
		});
	const resetSeats = () =>
		run(() =>
			Promise.resolve(
				client.mutate.resetAssignmentSize({
					__args: { conferenceId: routeParams.conferenceId, seats }
				})
			)
		);

	function openSplit(group: AssignmentGroup) {
		splitting = delegationById.get(group.delegationId ?? '');
	}

	function undoSplit(group: AssignmentGroup) {
		const delegationId = group.delegationId ?? '';
		return run(() =>
			Promise.resolve(client.mutate.undoDelegationSplit({ __args: { delegationId } }))
		);
	}
</script>

{#snippet groupCard(group: AssignmentGroup, container: string)}
	<GroupCard
		{group}
		delegation={delegationById.get(group.delegationId ?? '')}
		single={singleById.get(group.singleParticipantId ?? '')}
		review={view.reviewOf(group)}
		{container}
		onDragChange={(isDragging) => (dragging = isDragging ? group : undefined)}
		onSplit={() => openSplit(group)}
		onUndoSplit={() => undoSplit(group)}
		onUnassign={() => assignGroup(group)}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	{#if view.incompleteSplits.length > 0}
		<div class="alert alert-warning alert-soft">
			<i class="fa-duotone fa-triangle-exclamation text-xl"></i>
			{m.assignmentIncompleteSplitsHint({ count: view.incompleteSplits.length })}
		</div>
	{/if}

	<BoardToolbar
		{options}
		{size}
		{seats}
		showDisqualified={!!params.disqualified}
		{busy}
		canAutoAssign={pool.length > 0}
		onSize={(next) => {
			params.size = next;
			params.seats = 0;
		}}
		onSeats={(next) => (params.seats = next)}
		onShowDisqualified={(show) => (params.disqualified = show)}
		onAutoAssign={autoAssign}
		onReset={resetSeats}
	/>

	<div class="flex flex-col gap-4 xl:flex-row">
		<PoolSection
			container={POOL_CONTAINER}
			count={pool.length}
			hint={m.assignmentPoolHint({ size })}
			highlight={hasRole(dragging)}
			class="xl:w-96 xl:shrink-0"
			{onDrop}
		>
			{#each pool as group (group.key)}
				{@render groupCard(group, POOL_CONTAINER)}
			{/each}
		</PoolSection>

		<section class="flex grow flex-wrap content-start gap-3" aria-label={m.assignmentRoles()}>
			{#each shownRoles as role (role.key)}
				<RoleCard
					container={roleContainer(role.key)}
					title={role.title}
					subtitle={role.subtitle}
					alpha2Code={role.alpha2Code}
					icon={role.icon}
					seats={role.seats}
					taken={role.taken}
					highlight={freeSeats(view, role) >= (dragging?.size ?? Infinity)}
					{onDrop}
				>
					{#each role.groups as group (group.key)}
						{@render groupCard(group, roleContainer(role.key))}
					{/each}
				</RoleCard>
			{:else}
				<p class="text-base-content/60 w-full py-12 text-center">{m.assignmentNoRolesOfSize()}</p>
			{/each}
		</section>
	</div>
</div>

{#if splitting}
	<SplitModal delegation={splitting} onClose={() => (splitting = undefined)} />
{/if}
