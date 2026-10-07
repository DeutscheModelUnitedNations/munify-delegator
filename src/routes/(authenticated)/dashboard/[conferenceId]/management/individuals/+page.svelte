<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
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
	import { fetchAssignmentReviews } from '../assignment/board';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const singleParticipants = $derived(
		await client.liveQuery.singleParticipants({
			__args: { where: { conferenceId: { eq: routeParams.conferenceId } } },
			id: true,
			applied: true,
			school: true,
			appliedForRoles: { id: true, fontAwesomeIcon: true, name: true },
			assignedRole: { id: true, fontAwesomeIcon: true, name: true },
			motivation: true,
			experience: true,
			user: { id: true, familyName: true, givenName: true }
		})
	);
	const reviews = $derived(await fetchAssignmentReviews(routeParams.conferenceId));
	const evaluationById = $derived(
		new Map(reviews.map((review) => [review.singleParticipantId, review.evaluation]))
	);

	const columns: ManagedColumn<(typeof singleParticipants)[number]>[] = [
		nameColumn(),
		appliedColumn(),
		{
			id: 'roleApplications',
			header: m.roleApplications(),
			accessorFn: (row) => row.appliedForRoles.map((r) => r.name).join(' '),
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
			accessorFn: (row) => evaluationById.get(row.id) ?? 0,
			cell: ({ row }) =>
				row.original.applied
					? renderComponent(StarRating, {
							rating: evaluationById.get(row.original.id) ?? 0,
							size: 'xs'
						})
					: ''
		},
		{
			id: 'role',
			header: m.role(),
			accessorFn: (row) => row.assignedRole?.name ?? '',
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
			accessorFn: (row) => row.school ?? 'N/A'
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

	// TODO export data
</script>

<RegistrationAdminTable
	{columns}
	{columnClasses}
	rows={singleParticipants}
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
