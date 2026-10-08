<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { client } from '$lib/api/rumbleClient/client';
	import {
		POOL_CONTAINER,
		boardState,
		describeRole,
		dropAction,
		freeSeats,
		hasRole,
		inPageOrder,
		pickSize,
		poolCountsBesidesDraft,
		poolGroups,
		roleContainer,
		rolesWithSeats,
		sizeOptions,
		wishStatus
	} from '$lib/assignment/board';
	import { seatedRoles } from '$lib/assignment/capacity';
	import { PendingMoves } from '$lib/assignment/pendingMoves.svelte';
	import { liveSnapshot } from '$lib/api/liveSnapshot';
	import { memoizeLast } from '$lib/helpers/memoizeLast';
	import { targetKey, type AssignmentGroup } from '$lib/assignment/state';
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { DragDropState } from '@thisux/sveltednd';
	import { toast } from 'svelte-sonner';
	import { assignGroup } from '../assignGroup';
	import {
		fetchAssignmentDraft,
		fetchAssignmentRoles,
		fetchDelegationPoolPage,
		fetchDelegationPoolSizes,
		fetchSeatedApplications,
		type BoardDelegation,
		seatedSnapshot
	} from '../board';
	import { boardParams, withBoardParams } from '../boardParams';
	import BoardToolbar from '../BoardToolbar.svelte';
	import BusyOverlay from '../BusyOverlay.svelte';
	import GroupCard from '../GroupCard.svelte';
	import { PoolPages } from '../poolPages.svelte';
	import PoolList from '../PoolList.svelte';
	import PoolSection from '../PoolSection.svelte';
	import RoleCard from '../RoleCard.svelte';
	import SplitModal from '../SplitModal.svelte';
	import { succeeded, toastError } from '../toastError';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// The size and the filter are kept here and mirrored into the URL without a navigation. A
	// navigation (what `sveltekit-search-params` does) lands in a batch of its own while the pool
	// of the new size is still loading, and Svelte trips its "Batch has scheduled effects"
	// invariant on the overlap, leaving the board half updated. The URL is written on the next
	// task for the same reason: `replaceState` writes `page`, which must not happen while Svelte
	// is still committing the change it follows.
	const params = $state(boardParams(page.url.searchParams));
	$effect(() => {
		const next = { size: params.size, disqualified: params.disqualified };
		const timer = setTimeout(() => {
			// The browser's own URL: `page.url` does not follow shallow `replaceState` calls.
			const url = withBoardParams(new URL(location.href), next);
			if (url.search !== location.search) replaceState(url, page.state);
		});
		return () => clearTimeout(timer);
	});

	// Nothing here depends on the draft through a query: the draft brings the applications it
	// touches along, so a move arrives as one live update and asks for nothing afterwards.
	const [roles, draft, seated, poolCounts] = $derived(
		await Promise.all([
			fetchAssignmentRoles(routeParams.conferenceId),
			fetchAssignmentDraft(routeParams.conferenceId),
			fetchSeatedApplications(routeParams.conferenceId),
			fetchDelegationPoolSizes(routeParams.conferenceId, !!params.disqualified)
		])
	);
	// Plain copies of the live results the board works over (see `liveSnapshot`): everything
	// below reads plain arrays, and `memoizeLast` hands back the last board when they are the same.
	const roleSnapshot = {
		committees: liveSnapshot<(typeof roles.committees)[number]>(),
		nonStateActors: liveSnapshot<(typeof roles.nonStateActors)[number]>()
	};
	const plainRoles = $derived({
		committees: roleSnapshot.committees(roles.committees),
		nonStateActors: roleSnapshot.nonStateActors(roles.nonStateActors)
	});
	// Everything that holds a role or that the draft touches: the roles, their groups and seats.
	const plain = seatedSnapshot();
	const seatedSet = $derived(plain(draft, seated));
	const units = $derived(seatedSet.units);
	const draftSingleRoles = $derived(seatedSet.draftSingleRoles);
	const seatedDelegations = $derived(seatedSet.delegations);
	const seatedSingles = $derived(seatedSet.singleParticipants);
	const seatedReviewRows = $derived(seatedSet.reviews);
	const seatedRows = $derived({
		delegations: seatedDelegations,
		singleParticipants: seatedSingles,
		units,
		draftSingleRoles,
		reviews: seatedReviewRows
	});
	const seatedBoard = memoizeLast(boardState);
	const fullBoard = memoizeLast(boardState);
	// The size tabs and the roles need nothing but the seated applications; the size then decides
	// which pool the backend is asked for.
	const seatedRoleList = $derived(seatedRoles(plainRoles.committees, plainRoles.nonStateActors));
	const seatedView = $derived(seatedBoard(seatedRows, seatedRoleList));
	// How many open groups of each size the pool holds: the backend's counts, less the delegations
	// the draft touches, which the seated board counts itself.
	const poolSizes = $derived(
		poolCountsBesidesDraft(
			poolCounts,
			units.flatMap((unit) => unit.sourceDelegation ?? []),
			(id) => !!seatedView.reviewOf({ delegationId: id, singleParticipantId: null })?.disqualified
		)
	);
	const options = $derived(sizeOptions(seatedView, poolSizes));
	const size = $derived(pickSize(options, params.size ?? 0));
	// Roles are shown by the same seat count as the group size.
	const seats = $derived(size);

	// The pool: filtered to this size and ordered (best rated first) by the backend, a page at a
	// time as it scrolls. Pages are plain data, read once; what the draft or applying changes about
	// their delegations comes in live through `seated`, which is listed last so it wins.
	const poolFilter = $derived({ size, showDisqualified: !!params.disqualified });
	const poolKey = $derived(
		`${routeParams.conferenceId}|${poolFilter.size}|${poolFilter.showDisqualified}`
	);
	const poolLoader = new PoolPages<BoardDelegation>();
	$effect(() => {
		const { conferenceId } = routeParams;
		const filter = poolFilter;
		poolLoader
			.load(poolKey, (page) => fetchDelegationPoolPage(conferenceId, filter, page))
			.catch(toastError);
	});
	const poolPages = $derived(poolLoader.pages(poolKey));
	const poolLoading = $derived(poolLoader.pending(poolKey));
	const morePages = $derived(PoolPages.more(poolPages.at(-1)));
	const loadMore = () => {
		const { conferenceId } = routeParams;
		const filter = poolFilter;
		poolLoader
			.loadMore(poolKey, (page) => fetchDelegationPoolPage(conferenceId, filter, page))
			.catch(toastError);
	};

	// The board as far as it is loaded: the seated applications and the pool's pages.
	const delegations = $derived([
		...new Map(
			[...poolPages.flatMap((page) => page.rows), ...seatedDelegations].map((d) => [d.id, d])
		).values()
	]);
	const reviews = $derived([...poolPages.flatMap((page) => page.reviews), ...seatedReviewRows]);
	const view = $derived(fullBoard({ ...seatedRows, delegations, reviews }, seatedRoleList));
	// Pages stay in the order they were loaded, so the list does not reshuffle while it scrolls.
	const pool = $derived(
		inPageOrder(
			poolGroups(view, size, !!params.disqualified),
			poolPages.map((page) => page.rows)
		)
	);
	/** The backend's count plus the groups the draft put back without a role. */
	const poolCount = $derived(options.find((option) => option.size === size)?.openGroups ?? 0);
	const shownRoles = $derived(
		rolesWithSeats(seatedView, seats)
			.map((role) => ({
				...role,
				...describeRole(role.target, plainRoles, getFullTranslatedCountryNameFromISO3Code)
			}))
			.sort((a, b) => a.title.localeCompare(b.title))
	);

	let dragging = $state<AssignmentGroup | undefined>();
	let splitting = $state<BoardDelegation | undefined>();
	/** The bulk action under way; it covers the board until it is done. */
	let running = $state<'autoAssign' | 'reset'>();
	const busy = $derived(running !== undefined);
	/** Where the board shows a group now; its key changes when the draft gains or drops its unit. */
	const placeOf = (key: string) => {
		const group = view.groups.find((candidate) => candidate.key === key);
		return group ? (targetKey(group.target) ?? POOL_CONTAINER) : 'gone';
	};
	const moves = new PendingMoves(placeOf);
	$effect(() => moves.settle());

	const delegationById = $derived(new Map(delegations.map((d) => [d.id, d])));
	const singleById = $derived(new Map(seatedSingles.map((s) => [s.id, s])));

	/** A delegation with a role it did not wish for; converted singles have no wishes to miss. */
	const isBadFit = (group: AssignmentGroup) => {
		const wish = wishStatus(
			delegationById.get(group.delegationId ?? '')?.appliedForRoles,
			group.target
		);
		return !!wish && wish.rank === undefined;
	};
	/** The groups of a role, misfits first so they are seen at once. */
	const sortedGroups = (groups: AssignmentGroup[]) =>
		groups.toSorted((a, b) => Number(isBadFit(b)) - Number(isBadFit(a)));

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
		else void moves.track(action.group.key, () => assignGroup(action.group, action.target));
	}

	async function run(kind: 'autoAssign' | 'reset', action: () => Promise<unknown>) {
		running = kind;
		await action().catch(toastError);
		running = undefined;
	}

	const autoAssign = () =>
		run('autoAssign', async () => {
			const assigned = await client.mutate.autoAssignDelegations({
				__args: { conferenceId: routeParams.conferenceId, size }
			});
			toast.success(m.assignmentAutoAssigned({ count: assigned }));
		});
	const resetSeats = () =>
		run('reset', () =>
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
		return moves.track(group.key, () =>
			succeeded(client.mutate.undoDelegationSplit({ __args: { delegationId } }))
		);
	}
</script>

{#snippet groupCard(group: AssignmentGroup, container: string, fluid = false)}
	<GroupCard
		{group}
		delegation={delegationById.get(group.delegationId ?? '')}
		single={singleById.get(group.singleParticipantId ?? '')}
		review={view.reviewOf(group)}
		{container}
		{fluid}
		busy={moves.has(group.key)}
		conferenceId={routeParams.conferenceId}
		onDragChange={(isDragging) => (dragging = isDragging ? group : undefined)}
		onSplit={() => openSplit(group)}
		onUndoSplit={() => undoSplit(group)}
	/>
{/snippet}

<div class="flex flex-col gap-4">
	{#if view.incompleteSplits.length > 0}
		<div class="alert alert-warning alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-xl"></i>
			{m.assignmentIncompleteSplitsHint({ count: view.incompleteSplits.length })}
		</div>
	{/if}

	<BoardToolbar
		{options}
		{size}
		{seats}
		showDisqualified={!!params.disqualified}
		{busy}
		{running}
		canAutoAssign={poolCount > 0}
		onSize={(next) => (params.size = next)}
		onShowDisqualified={(show) => (params.disqualified = show)}
		onAutoAssign={autoAssign}
		onReset={resetSeats}
	/>

	<div class="relative flex flex-col gap-4 xl:flex-row" aria-busy={busy}>
		{#if busy}
			<BusyOverlay size="lg" />
		{/if}
		<PoolSection
			container={POOL_CONTAINER}
			count={poolCount}
			hint={m.assignmentPoolHint({ size })}
			highlight={hasRole(dragging)}
			class="xl:sticky xl:top-20 xl:h-[calc(100dvh-6rem)] xl:w-96 xl:shrink-0 xl:self-start"
			virtual
			{onDrop}
		>
			<PoolList items={pool} more={morePages} loading={poolLoading} onLoadMore={loadMore}>
				{#snippet row(group)}
					{@render groupCard(group, POOL_CONTAINER, true)}
				{/snippet}
			</PoolList>
		</PoolSection>

		<section
			class="grid grow grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] content-start items-start gap-3"
			aria-label={m.assignmentRoles()}
		>
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
					{#each sortedGroups(role.groups) as group (group.key)}
						{@render groupCard(group, roleContainer(role.key), true)}
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
