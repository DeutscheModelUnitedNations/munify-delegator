<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import DataGrid from '#lib/components/dataGrid/DataGrid.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { conflictMessageOf } from '#lib/api/errorCodes';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { startImpersonation } from '#lib/api/startImpersonation';
	import TeamMemberActions from './TeamMemberActions.svelte';
	import TeamManagementPage from '../TeamManagementPage.svelte';
	import { teamMemberColumns } from './columns';
	import { teamMembersSource } from './teamMembersSource';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Read once: the team shell keys each page by its pathname, so this instance never changes
	// conference. Read live, a navigation of the table's own URL state re-ran the queries inside a
	// pending batch, which still shows `params` as `{}`, and asked for no conference.
	const conferenceId = untrack(() => params.conferenceId);

	const columns = teamMemberColumns();
	const source = teamMembersSource(conferenceId);
	const isAdmin = $derived((await getCurrentUser()).isAdmin);

	const handleDelete = async (id: string) => {
		if (!(await confirmDialog({ text: m.confirmDeleteTeamMember(), danger: true }))) return;

		const promise = Promise.resolve(client.mutate.deleteTeamMember({ __args: { id } }));
		toast.promise(promise, {
			loading: m.deletingTeamMember(),
			success: m.teamMemberDeleted(),
			// The last project management cannot be removed; the server says so.
			error: (error: unknown) => conflictMessageOf(error) ?? m.deleteTeamMemberError()
		});
		await promise;
	};
</script>

<TeamManagementPage {conferenceId}>
	<DataGrid
		{columns}
		{source}
		rowId={(row) => row.id}
		base={{ sorting: [{ id: 'joinedAt', desc: false }], pageSize: 50 }}
		views={{ table: 'teamMembers', conferenceId }}
		label={m.teamManagement()}
		exportName="team"
		selectable
		actionsWidth={130}
	>
		{#snippet actions(row)}
			<TeamMemberActions
				onOpenUserCard={() => openUserCard(row.userId)}
				onImpersonate={isAdmin ? () => startImpersonation(row.userId) : undefined}
				onDelete={() => handleDelete(row.id)}
			/>
		{/snippet}
	</DataGrid>
</TeamManagementPage>
