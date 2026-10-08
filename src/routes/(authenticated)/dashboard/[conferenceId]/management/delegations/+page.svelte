<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import type { BoardReview } from '../assignment/board';
	import { m } from '$lib/paraglide/messages';
	import { createTableState } from '$lib/components/tanStackTable/tableState.svelte';
	import { fetchAllDelegations, fetchDelegationsPage } from './delegationsQuery';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import { appliedColumn } from '$lib/components/tanStackTable/commonColumns';
	import AssignmentBadge from '$lib/components/tanStackTable/cells/AssignmentBadge.svelte';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import DelegationDrawer from './DelegationDrawer.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import codenmz from '$lib/helpers/codenamize';
	import type { PageProps } from './$types';
	import { assignedRoleName } from './delegationRole';
	import StarRating from '$lib/components/StarRating.svelte';

	let { params: routeParams }: PageProps = $props();

	// Navigations (the table's own URL state is one) hand over fresh params; reading them inside an
	// awaited derived would refetch from whatever state the batch under way still shows.
	const conferenceId = $derived(routeParams.conferenceId);

	// Search, filters, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState();
	const fetched = $derived(await fetchDelegationsPage(conferenceId, tableState));
	// The nation's translated name is only known client-side, so it is joined on here.
	function toRows(
		rows: (typeof fetched)['rows'],
		reviews: readonly Pick<BoardReview, 'delegationId' | 'evaluation'>[]
	) {
		const evaluationById = new Map(
			reviews.map((review) => [review.delegationId, review.evaluation])
		);
		return rows.map((d) => ({
			...d,
			evaluation: evaluationById.get(d.id) ?? null,
			assignedNation: d.assignedNation
				? {
						...d.assignedNation,
						name: getFullTranslatedCountryNameFromISO3Code(d.assignedNation.alpha3Code)
					}
				: undefined
		}));
	}
	const delegations = $derived(toRows(fetched.rows, fetched.reviews));

	async function exportRows() {
		const all = await fetchAllDelegations(conferenceId, tableState);
		return toRows(all.rows, all.reviews);
	}

	const columns: ManagedColumn<(typeof delegations)[number]>[] = [
		{
			id: 'codename',
			header: 'Codename',
			accessorFn: (row) => codenmz(row.id),
			enableSorting: false
		},
		{
			id: 'entryCode',
			header: 'Entry Code',
			accessorFn: (row) => row.entryCode,
			cell: ({ getValue }) => getValue<string>(),
			filter: { type: 'text' }
		},
		{ ...appliedColumn(), filter: { type: 'boolean' } },
		{
			id: 'role',
			header: m.role(),
			accessorFn: assignedRoleName,
			enableSorting: false,
			cell: ({ row }) =>
				row.original.assignedNation
					? renderComponent(AssignmentBadge, {
							tooltip: row.original.assignedNation.name,
							flagCode: row.original.assignedNation.alpha2Code
						})
					: row.original.assignedNonStateActor
						? renderComponent(AssignmentBadge, {
								tooltip: row.original.assignedNonStateActor.name,
								icon: row.original.assignedNonStateActor.fontAwesomeIcon
							})
						: ''
		},
		{
			id: 'evaluation',
			header: m.assignmentWeightsRating(),
			accessorFn: (row) => row.evaluation ?? 0,
			enableSorting: false,
			cell: ({ row }) =>
				row.original.applied
					? renderComponent(StarRating, { rating: row.original.evaluation ?? 0, size: 'xs' })
					: ''
		},
		{
			id: 'school',
			header: m.schoolOrInstitution(),
			accessorFn: (row) => row.school ?? 'N/A',
			filter: { type: 'text' }
		},
		{
			id: 'members',
			header: m.members(),
			accessorFn: (row) => row.members.length,
			enableSorting: false
		},
		{
			id: 'appliedForRoles',
			header: m.roleApplications(),
			accessorFn: (row) => row.appliedForRoles.length,
			enableSorting: false
		}
	];

	const columnClasses = {
		entryCode: 'font-mono',
		applied: 'text-center',
		role: 'text-center',
		members: 'text-center',
		appliedForRoles: 'text-center'
	};
</script>

<RegistrationAdminTable
	{columns}
	{columnClasses}
	rows={delegations}
	{tableState}
	hasMore={fetched.hasMore}
	rowCount={fetched.total}
	{exportRows}
	category={m.delegation()}
	pendingHeader={(selectedId) => ({ id: selectedId, title: codenmz(selectedId) })}
>
	{#snippet drawer(selectedId, close)}
		<DelegationDrawer
			delegationId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
