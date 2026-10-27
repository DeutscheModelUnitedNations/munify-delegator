<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import {
		CONVERT_CONTAINER,
		POOL_CONTAINER,
		boardState,
		roleContainer,
		singleDropAction
	} from '#lib/assignment/board.js';
	import { seatedRoles } from '#lib/assignment/capacity.js';
	import { liveSnapshot } from '#lib/api/liveSnapshot.js';
	import { createPendingMoves } from '#lib/assignment/pendingMoves.svelte.js';
	import { memoizeLast } from '#lib/helpers/memoizeLast.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { DragDropState } from '@thisux/sveltednd';
	import { toast } from 'svelte-sonner';
	import {
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchSchoolSeatLimit,
		fetchSeatedApplications,
		fetchSinglePoolPage,
		type BoardSingleParticipant,
		seatedSnapshot
	} from '../board';
	import BusyOverlay from '../BusyOverlay.svelte';
	import { createPool, createPoolSearch, onPages } from '../poolPages.svelte';
	import PoolList from '../PoolList.svelte';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import { succeeded, toastError } from '../toastError';
	import ConvertZone from './ConvertZone.svelte';
	import SingleCard from './SingleCard.svelte';
	import VirtualList from 'svelte-virtual-list';
	import { schoolLookupsOf, schoolSeats, schoolsOfGroup } from '#lib/assignment/schoolSeats.js';
	import { warnAboutSchoolSeats } from '../schoolSeatsWarning';
	import SchoolSeatsPanel from '../SchoolSeatsPanel.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Nothing here depends on the draft through a query: the draft brings the applications it
	// touches along, so a move arrives as one live update and asks for nothing afterwards.
	const [roles, draft, seated, schoolLimit] = $derived(
		await Promise.all([
			fetchAssignmentRoles(params.conferenceId),
			fetchAssignmentDraft(params.conferenceId),
			fetchSeatedApplications(params.conferenceId),
			fetchSchoolSeatLimit(params.conferenceId)
		])
	);
	const maxSeatsPerSchool = $derived(schoolLimit.maxSeatsPerSchool ?? null);
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
	const search = createPoolSearch();
	const poolKey = $derived(`${params.conferenceId}|${search.term}`);
	const poolLoader = createPool<BoardSingleParticipant>(() => {
		const { conferenceId } = params;
		const term = search.term;
		return { key: poolKey, fetchPage: (page) => fetchSinglePoolPage(conferenceId, term, page) };
	});
	const poolPages = $derived(poolLoader.pages);
	const poolLoading = $derived(poolLoader.loading);
	const morePages = $derived(poolLoader.more);

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
	const moves = createPendingMoves(placeOf);
	$effect(() => moves.settle());

	const singleById = $derived(new Map(singleParticipants.map((s) => [s.id, s])));
	const schoolLookups = $derived(schoolLookupsOf(seatedSet.delegations, singleParticipants));
	const schoolCounts = $derived(schoolSeats(view, schoolLookups));

	/** Warns (never blocks) when a single participant taking a role takes their school past the limit. */
	const holdsRole = (singleParticipantId: string) =>
		view.singles.some(
			(single) => single.singleParticipantId === singleParticipantId && !!single.roleId
		);

	function warnAboutSchool(singleParticipantId: string) {
		const single = { delegationId: null, singleParticipantId, memberIds: [] };
		const added = holdsRole(singleParticipantId) ? [] : schoolsOfGroup(single, schoolLookups);
		warnAboutSchoolSeats(schoolCounts, added, maxSeatsPerSchool);
	}
	const openSingles = $derived(view.singles.filter((single) => !single.roleId));
	// a search's matches are what its pages hold
	const pool = $derived(search.term ? onPages(openSingles, poolPages) : openSingles);

	const loadMore = () => poolLoader.loadMore();
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
		if (action.type === 'role' && action.roleId) warnAboutSchool(singleParticipantId);
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
		<i class="fa-sharp-duotone fa-solid fa-user-tie text-xl"></i>
		<p>{m.assignmentSinglesHint()}</p>
		<button
			class="btn btn-primary btn-sm"
			disabled={busy || (openSingles.length === 0 && !morePages)}
			onclick={autoAssign}
		>
			{#if busy}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-wand-magic-sparkles"></i>
			{/if}
			{m.assignmentAutoAssignSingles()}
		</button>
	</div>

	<div class="relative flex flex-col gap-4 xl:flex-row" aria-busy={busy}>
		{#if busy}
			<BusyOverlay size="lg" />
		{/if}
		<div
			class="flex flex-col gap-4 xl:sticky xl:top-20 xl:h-[max(28rem,calc(100dvh-24rem))] xl:w-96 xl:shrink-0 xl:self-start"
		>
			<PoolSection
				container={POOL_CONTAINER}
				count={pool.length}
				more={morePages}
				class="min-h-0 xl:flex-1"
				virtual
				search={{
					value: search.typed,
					searching: search.settling || (!!search.term && poolLoading),
					onInput: (value) => (search.typed = value)
				}}
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
			<SchoolSeatsPanel counts={schoolCounts} limit={maxSeatsPerSchool} shown={5} nearLimitOnly />
		</div>

		<section
			class="grid grow grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] content-start items-start gap-3"
			aria-label={m.assignmentRoles()}
		>
			{#each roles.customRoles as role (role.id)}
				{@const holders = holdersOf(role.id)}
				<RoleCard
					container={roleContainer(role.id)}
					title={role.name ?? ''}
					icon={role.fontAwesomeIcon ?? undefined}
					seats={role.seatAmount ?? 0}
					taken={holders.length}
					highlight={dragging && holders.length < (role.seatAmount ?? 0)}
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
