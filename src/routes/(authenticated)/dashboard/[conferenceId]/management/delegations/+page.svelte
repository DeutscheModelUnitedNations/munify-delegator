<script lang="ts">
	// import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
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
	import { fetchAssignmentReviews } from '../assignment/board';

	let { params: routeParams }: PageProps = $props();

	// Only what the table's columns show and search; the drawer fetches the rest of a delegation.
	const fetchedDelegations = $derived(
		await client.liveQuery.delegations({
			__args: { where: { conferenceId: { eq: routeParams.conferenceId } } },
			id: true,
			entryCode: true,
			applied: true,
			school: true,
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true },
			members: { id: true },
			appliedForRoles: { id: true }
		})
	);
	const reviews = $derived(await fetchAssignmentReviews(routeParams.conferenceId));
	const evaluationById = $derived(
		new Map(reviews.map((review) => [review.delegationId, review.evaluation]))
	);
	// The nation's translated name is only known client-side, so it is joined on here.
	const delegations = $derived(
		fetchedDelegations.map((d) => ({
			...d,
			evaluation: evaluationById.get(d.id) ?? null,
			assignedNation: d.assignedNation
				? {
						...d.assignedNation,
						name: getFullTranslatedCountryNameFromISO3Code(d.assignedNation.alpha3Code)
					}
				: undefined
		}))
	);

	const columns: ManagedColumn<(typeof delegations)[number]>[] = [
		{
			id: 'codename',
			header: 'Codename',
			accessorFn: (row) => codenmz(row.id)
		},
		{
			id: 'entryCode',
			header: 'Entry Code',
			accessorFn: (row) => row.entryCode,
			cell: ({ getValue }) => getValue<string>()
		},
		appliedColumn(),
		{
			id: 'role',
			header: m.role(),
			accessorFn: assignedRoleName,
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
			cell: ({ row }) =>
				row.original.applied
					? renderComponent(StarRating, { rating: row.original.evaluation ?? 0, size: 'xs' })
					: ''
		},
		{
			id: 'school',
			header: m.schoolOrInstitution(),
			accessorFn: (row) => row.school ?? 'N/A'
		},
		{
			id: 'members',
			header: m.members(),
			accessorFn: (row) => row.members.length
		},
		{
			id: 'appliedForRoles',
			header: m.roleApplications(),
			accessorFn: (row) => row.appliedForRoles.length
		}
	];

	const columnClasses = {
		entryCode: 'font-mono',
		applied: 'text-center',
		role: 'text-center',
		members: 'text-center',
		appliedForRoles: 'text-center'
	};

	// TODO export data
</script>

<RegistrationAdminTable
	{columns}
	{columnClasses}
	rows={delegations}
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
