<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		CONVERT_CONTAINER,
		POOL_CONTAINER,
		boardState,
		roleContainer,
		singleDropAction
	} from '$lib/assignment/board';
	import { PendingMoves } from '$lib/assignment/pendingMoves.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { DragDropState } from '@thisux/sveltednd';
	import { toast } from 'svelte-sonner';
	import {
		draftApplicationIds,
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchReviewsOf,
		fetchSeatedApplications,
		fetchSinglePoolPage,
		idsOf,
		type BoardSingleParticipant
	} from '../board';
	import BusyOverlay from '../BusyOverlay.svelte';
	import { PoolPages } from '../poolPages.svelte';
	import PoolList from '../PoolList.svelte';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import { succeeded, toastError } from '../toastError';
	import ConvertZone from './ConvertZone.svelte';
	import SingleCard from './SingleCard.svelte';
	import VirtualList from 'svelte-virtual-list';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const [roles, draft] = $derived(
		await Promise.all([
			fetchAssignmentRoles(params.conferenceId),
			fetchAssignmentDraft(params.conferenceId)
		])
	);
	// Everyone who holds a role or whom the draft touches: the roles and their holders.
	const touched = $derived(draftApplicationIds(draft));
	const seated = $derived(await fetchSeatedApplications(params.conferenceId, touched));

	// The single participants without a role, a page at a time as the pool scrolls. Pages are
	// plain data, read once; what the draft or applying changes about them comes in live through
	// `seated`, which is listed last so it wins.
	const poolLoader = new PoolPages<BoardSingleParticipant>();
	$effect(() => {
		const { conferenceId } = params;
		poolLoader
			.load(conferenceId, (page) => fetchSinglePoolPage(conferenceId, page))
			.catch(toastError);
	});
	const poolPages = $derived(poolLoader.pages(params.conferenceId));
	const poolLoading = $derived(poolLoader.pending(params.conferenceId));
	const morePages = $derived(PoolPages.more(poolPages.at(-1)));
	const seatedIds = $derived({
		delegationIds: [],
		singleParticipantIds: idsOf(seated.singleParticipants)
	});
	const seatedReviews = $derived(await fetchReviewsOf(params.conferenceId, seatedIds));

	const singleParticipants = $derived([
		...new Map(
			[...poolPages.flatMap((page) => page.rows), ...seated.singleParticipants].map((s) => [
				s.id,
				s
			])
		).values()
	]);
	const view = $derived(
		boardState(
			{
				delegations: seated.delegations,
				singleParticipants,
				units: draft.units,
				draftSingleRoles: draft.draftSingleRoles,
				reviews: [...poolPages.flatMap((page) => page.reviews), ...seatedReviews]
			},
			roles
		)
	);

	let dragging = $state(false);
	let busy = $state(false);

	async function autoAssign() {
		busy = true;
		const mutation = Promise.resolve(
			client.mutate.autoAssignSingleParticipants({ __args: { conferenceId: params.conferenceId } })
		);
		if (await succeeded(mutation)) {
			toast.success(m.assignmentSinglesAutoAssigned({ count: await mutation }));
		}
		busy = false;
	}

	/** Where the board shows a single participant now: a role, the pool or the converted ones. */
	const placeOf = (singleParticipantId: string) => {
		const single = view.singles.find((entry) => entry.singleParticipantId === singleParticipantId);
		if (single) return single.roleId ?? POOL_CONTAINER;
		const converted = view.groups.some(
			(group) => group.singleParticipantId === singleParticipantId
		);
		return converted ? CONVERT_CONTAINER : 'gone';
	};
	const moves = new PendingMoves(placeOf);
	$effect(() => moves.settle());

	const singleById = $derived(new Map(singleParticipants.map((s) => [s.id, s])));
	const pool = $derived(view.singles.filter((single) => !single.roleId));

	const loadMore = () => {
		const { conferenceId } = params;
		poolLoader
			.loadMore(conferenceId, (page) => fetchSinglePoolPage(conferenceId, page))
			.catch(toastError);
	};
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
		void moves.track(singleParticipantId, () =>
			succeeded(
				action.type === 'convert'
					? client.mutate.convertSingleParticipant({ __args: { singleParticipantId } })
					: client.mutate.assignSingleParticipantRole({
							__args: { singleParticipantId, roleId: action.roleId }
						})
			)
		);
	}

	const revert = (singleParticipantId: string) =>
		moves.track(singleParticipantId, () =>
			succeeded(
				client.mutate.revertSingleParticipantConversion({ __args: { singleParticipantId } })
			)
		);
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
		busy={moves.has(single.singleParticipantId)}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	<div class="alert alert-info alert-soft">
		<i class="fa-duotone fa-user-tie text-xl"></i>
		<p>{m.assignmentSinglesHint()}</p>
		<button
			class="btn btn-primary btn-sm"
			disabled={busy || (pool.length === 0 && !morePages)}
			onclick={autoAssign}
		>
			{#if busy}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<i class="fa-duotone fa-wand-magic-sparkles"></i>
			{/if}
			{m.assignmentAutoAssignSingles()}
		</button>
	</div>

	<div class="relative flex flex-col gap-4 xl:flex-row" aria-busy={busy}>
		{#if busy}
			<BusyOverlay size="lg" />
		{/if}
		<div class="flex flex-col gap-4 xl:w-96 xl:shrink-0">
			<PoolSection container={POOL_CONTAINER} count={pool.length} more={morePages} virtual {onDrop}>
				<PoolList items={pool} more={morePages} loading={poolLoading} onLoadMore={loadMore}>
					{#snippet row(single)}
						{@render singleCard(single, POOL_CONTAINER, true)}
					{/snippet}
				</PoolList>
			</PoolSection>
			<ConvertZone
				{converted}
				highlight={dragging}
				reverting={(singleParticipantId) => moves.has(singleParticipantId)}
				{onDrop}
				onRevert={revert}
			/>
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
