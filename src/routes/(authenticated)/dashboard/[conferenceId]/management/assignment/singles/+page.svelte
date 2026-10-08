<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		CONVERT_CONTAINER,
		POOL_CONTAINER,
		boardState,
		roleContainer,
		singleDropAction
	} from '$lib/assignment/board';
	import { seatedRoles } from '$lib/assignment/capacity';
	import { liveSnapshot } from '$lib/api/liveSnapshot';
	import { PendingMoves } from '$lib/assignment/pendingMoves.svelte';
	import { memoizeLast } from '$lib/helpers/memoizeLast';
	import { m } from '$lib/paraglide/messages';
	import type { DragDropState } from '@thisux/sveltednd';
	import { toast } from 'svelte-sonner';
	import {
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchSeatedApplications,
		fetchSinglePoolPage,
		type BoardSingleParticipant,
		seatedSnapshot
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

	// Nothing here depends on the draft through a query: the draft brings the applications it
	// touches along, so a move arrives as one live update and asks for nothing afterwards.
	const [roles, draft, seated] = $derived(
		await Promise.all([
			fetchAssignmentRoles(params.conferenceId),
			fetchAssignmentDraft(params.conferenceId),
			fetchSeatedApplications(params.conferenceId)
		])
	);
	// Plain copies of the live results the board works over (see `liveSnapshot`).
	const roleSnapshot = {
		committees: liveSnapshot<(typeof roles.committees)[number]>(),
		nonStateActors: liveSnapshot<(typeof roles.nonStateActors)[number]>()
	};
	const seatedRoleList = $derived(
		seatedRoles(
			roleSnapshot.committees(roles.committees),
			roleSnapshot.nonStateActors(roles.nonStateActors)
		)
	);
	// Everyone who holds a role or whom the draft touches: the roles and their holders.
	const plain = seatedSnapshot();
	const seatedSet = $derived(plain(draft, seated));
	const units = $derived(seatedSet.units);
	const draftSingleRoles = $derived(seatedSet.draftSingleRoles);

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

	const singleParticipants = $derived([
		...new Map(
			[...poolPages.flatMap((page) => page.rows), ...seatedSet.singleParticipants].map((s) => [
				s.id,
				s
			])
		).values()
	]);
	const reviews = $derived([...poolPages.flatMap((page) => page.reviews), ...seatedSet.reviews]);
	const board = memoizeLast(boardState);
	const view = $derived(
		board(
			{ delegations: seatedSet.delegations, singleParticipants, units, draftSingleRoles, reviews },
			seatedRoleList
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
		<div
			class="flex flex-col gap-4 xl:sticky xl:top-20 xl:h-[calc(100dvh-6rem)] xl:w-96 xl:shrink-0 xl:self-start"
		>
			<PoolSection
				container={POOL_CONTAINER}
				count={pool.length}
				more={morePages}
				class="min-h-0 xl:flex-1"
				virtual
				{onDrop}
			>
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
