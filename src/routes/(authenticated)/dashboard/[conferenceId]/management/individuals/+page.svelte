<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import type { BoardReview } from '../assignment/board';
	import { m } from '$lib/paraglide/messages';
	import { createTableState } from '$lib/components/tanStackTable/tableState.svelte';
	import { fetchAllIndividuals, fetchIndividualsPage } from './individualsQuery';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import {
		appliedColumn,
		nameColumn,
		userCardColumn
	} from '$lib/components/tanStackTable/commonColumns';
	import IconCell from '$lib/components/tanStackTable/cells/IconCell.svelte';
	import IconListCell from '$lib/components/tanStackTable/cells/IconListCell.svelte';
	import RegistrationAdminTable from '$lib/components/registrationAdmin/RegistrationAdminTable.svelte';
	import IndividualDrawer from './IndividualDrawer.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Navigations (the table's own URL state is one) hand over fresh params; reading them inside an
	// awaited derived would refetch from whatever state the batch under way still shows.
	const conferenceId = $derived(routeParams.conferenceId);

	// Search, filters, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState();
	const fetched = $derived(await fetchIndividualsPage(conferenceId, tableState));

	function toRows(
		rows: (typeof fetched)['rows'],
		reviews: readonly Pick<BoardReview, 'singleParticipantId' | 'evaluation'>[]
	) {
		const evaluationById = new Map(
			reviews.map((review) => [review.singleParticipantId, review.evaluation])
		);
		return rows.map((row) => ({ ...row, evaluation: evaluationById.get(row.id) ?? 0 }));
	}
	const singleParticipants = $derived(toRows(fetched.rows, fetched.reviews));

	async function exportRows() {
		const all = await fetchAllIndividuals(conferenceId, tableState);
		return toRows(all.rows, all.reviews);
	}

	const columns: ManagedColumn<(typeof singleParticipants)[number]>[] = [
		{ ...nameColumn(), enableSorting: false },
		{ ...appliedColumn(), filter: { type: 'boolean' } },
		{
			id: 'roleApplications',
			header: m.roleApplications(),
			accessorFn: (row) => row.appliedForRoles.map((r) => r.name).join(' '),
			enableSorting: false,
			cell: ({ row }) =>
				row.original.appliedForRoles.length === 0
					? 'N/A'
					: renderComponent(IconListCell, {
							items: row.original.appliedForRoles.map((r) => ({
								icon: `fa-duotone fa-${r.fontAwesomeIcon?.replace('fa-', '')}`,
								tooltip: r.name
							}))
						})
		},
		{
			id: 'evaluation',
			header: m.assignmentWeightsRating(),
			accessorFn: (row) => row.evaluation,
			enableSorting: false,
			cell: ({ row }) =>
				row.original.applied
					? renderComponent(StarRating, {
							rating: row.original.evaluation,
							size: 'xs'
						})
					: ''
		},
		{
			id: 'role',
			header: m.role(),
			accessorFn: (row) => row.assignedRole?.name ?? '',
			enableSorting: false,
			cell: ({ row }) =>
				row.original.assignedRole
					? renderComponent(IconCell, {
							icon: `fa-duotone fa-${row.original.assignedRole.fontAwesomeIcon?.replace('fa-', '')}`,
							tooltip: row.original.assignedRole.name
						})
					: ''
		},
		{
			id: 'school',
			header: m.schoolOrInstitution(),
			accessorFn: (row) => row.school ?? 'N/A',
			filter: { type: 'text' }
		},
		{
			id: 'motivation',
			header: m.motivation(),
			accessorFn: (row) => row.motivation ?? 'N/A',
			enableSorting: false
		},
		{
			id: 'experience',
			header: m.experience(),
			accessorFn: (row) => row.experience ?? 'N/A',
			enableSorting: false
		},
		userCardColumn()
	];

	const columnClasses = { applied: 'text-center', roleApplications: 'text-center' };
</script>

<RegistrationAdminTable
	{columns}
	{columnClasses}
	rows={singleParticipants}
	{tableState}
	hasMore={fetched.hasMore}
	rowCount={fetched.total}
	{exportRows}
	category={m.singleParticipant()}
>
	{#snippet drawer(selectedId, close)}
		<IndividualDrawer
			singleParticipantId={selectedId}
			conferenceId={routeParams.conferenceId}
			open
			onClose={close}
		/>
	{/snippet}
</RegistrationAdminTable>
