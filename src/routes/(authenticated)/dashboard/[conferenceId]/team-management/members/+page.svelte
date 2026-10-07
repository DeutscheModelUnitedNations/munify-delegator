<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import { renderComponent } from '$lib/components/tanStackTable';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import BadgeCell from '$lib/components/tanStackTable/cells/BadgeCell.svelte';
	import TeamMemberActions from './TeamMemberActions.svelte';
	import TeamManagementPage from '../TeamManagementPage.svelte';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import { client } from '$lib/api/rumbleClient/client';
	import { createTableState } from '$lib/components/tanStackTable/tableState.svelte';
	import { TEAM_ROLES, fetchAllTeamMembers, fetchTeamMembersPage } from './teamMembersQuery';
	import { toast } from 'svelte-sonner';
	import { z } from 'zod';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { startImpersonation } from '$lib/api/startImpersonation';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Navigations (the table's own URL state is one) hand over fresh params; reading them inside an
	// awaited derived would refetch from whatever state the batch under way still shows.
	const conferenceId = $derived(params.conferenceId);

	// Search, filters, order and paging run in the backend; the table only holds this page.
	const tableState = createTableState();
	const fetched = $derived(await fetchTeamMembersPage(conferenceId, tableState));
	const teamMembers = $derived(fetched.rows);
	const exportRows = () => fetchAllTeamMembers(conferenceId, tableState);
	const isAdmin = $derived((await getCurrentUser()).isAdmin);

	// Dedicated schema for profile completeness validation
	const profileCompletenessSchema = z.object({
		birthday: z
			.string()
			.nullable()
			.refine((val) => val !== null, { message: 'Birthday required' }),
		phone: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Phone required' }),
		street: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Street required' }),
		zip: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Zip required' }),
		city: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'City required' }),
		country: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Country required' }),
		gender: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Gender required' }),
		foodPreference: z
			.string()
			.nullable()
			.refine((val) => val !== null && val.length > 0, { message: 'Food preference required' })
	});

	function isProfileComplete(user: {
		birthday: Date | null;
		phone: string | null;
		street: string | null;
		zip: string | null;
		city: string | null;
		country: string | null;
		gender: string | null;
		foodPreference: string | null;
	}): boolean {
		return profileCompletenessSchema.safeParse(user).success;
	}

	const handleDelete = async (id: string) => {
		if (!confirm(m.confirmDeleteTeamMember())) return;

		const promise = Promise.resolve(client.mutate.deleteTeamMember({ __args: { id } }));
		toast.promise(promise, {
			loading: m.deletingTeamMember(),
			success: m.teamMemberDeleted(),
			error: m.deleteTeamMemberError()
		});
		await promise;
	};

	const roleColors: Record<string, string> = {
		PROJECT_MANAGEMENT: 'badge-primary',
		PARTICIPANT_CARE: 'badge-secondary',
		REVIEWER: 'badge-accent',
		MEMBER: 'badge-ghost',
		TEAM_COORDINATOR: 'badge-info',
		CONTENT_LEAD: 'badge-warning'
	};

	const columns: ManagedColumn<(typeof teamMembers)[number]>[] = [
		{
			id: 'family_name',
			header: m.familyName(),
			accessorFn: (row) => row.user.familyName,
			enableSorting: false
		},
		{
			id: 'given_name',
			header: m.givenName(),
			accessorFn: (row) => row.user.givenName,
			enableSorting: false
		},
		{
			id: 'email',
			header: m.email(),
			accessorFn: (row) => row.user.email,
			enableSorting: false
		},
		{
			id: 'role',
			header: m.role(),
			accessorFn: (row) => translateTeamRole(row.role),
			filter: { type: 'enum', label: translateTeamRole, options: TEAM_ROLES },
			cell: ({ row }) =>
				renderComponent(BadgeCell, {
					label: translateTeamRole(row.original.role),
					variant: roleColors[row.original.role] ?? 'badge-ghost'
				})
		},
		{
			id: 'profileStatus',
			header: m.profileStatus(),
			accessorFn: (row) => (isProfileComplete(row.user) ? m.complete() : m.incomplete()),
			enableSorting: false,
			cell: ({ row }) =>
				isProfileComplete(row.original.user)
					? renderComponent(BadgeCell, { label: m.complete(), variant: 'badge-success' })
					: renderComponent(BadgeCell, {
							label: m.incomplete(),
							variant: 'badge-warning',
							title: m.profileIncompleteHint()
						})
		},
		{
			id: 'actions',
			header: '',
			cell: ({ row }) =>
				renderComponent(TeamMemberActions, {
					onOpenUserCard: () => openUserCard(row.original.user.id),
					onImpersonate:
						isAdmin && IMPERSONATION_ENABLED
							? () => startImpersonation(row.original.user.id)
							: undefined,
					onDelete: () => handleDelete(row.original.id)
				}),
			enableSorting: false
		}
	];
</script>

<TeamManagementPage title={m.teamMembers()} conferenceId={params.conferenceId}>
	<ManagedTable
		{columns}
		rows={teamMembers}
		{tableState}
		hasMore={fetched.hasMore}
		rowCount={fetched.total}
		{exportRows}
	/>
</TeamManagementPage>
