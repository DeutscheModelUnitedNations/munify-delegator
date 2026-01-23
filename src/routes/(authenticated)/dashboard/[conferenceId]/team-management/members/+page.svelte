<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import InviteTeamMembersModal from '$lib/components/TeamManagement/InviteTeamMembersModal.svelte';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import { cache, graphql } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { PageData } from './$houdini';
	import { userFormSchema } from '../../../../my-account/form-schema';

	let { data }: { data: PageData } = $props();

	const teamQuery = data.TeamManagementMembersQuery;
	let teamMembers = $derived($teamQuery.data?.findManyTeamMembers ?? []);

	let inviteMembersModalOpen = $state(false);

	function isProfileComplete(user: {
		birthday: string | null;
		phone: string | null;
		street: string | null;
		zip: string | null;
		city: string | null;
		country: string | null;
		gender: string | null;
		foodPreference: string | null;
	}): boolean {
		return userFormSchema.safeParse(user).success;
	}

	const deleteTeamMemberMutation = graphql(`
		mutation DeleteTeamMemberFromManagement($id: String!) {
			deleteOneTeamMember(where: { id: $id }) {
				id
			}
		}
	`);

	const handleDelete = async (id: string) => {
		if (!confirm(m.confirmDeleteTeamMember())) return;

		const promise = deleteTeamMemberMutation.mutate({ id });
		toast.promise(promise, {
			loading: m.deletingTeamMember(),
			success: m.teamMemberDeleted(),
			error: m.deleteTeamMemberError()
		});
		await promise;

		cache.markStale();
		await invalidateAll();
	};

	// Expose function globally for onclick handlers in rendered HTML
	onMount(() => {
		(window as any).handleTeamMemberDelete = handleDelete;
		return () => {
			delete (window as any).handleTeamMemberDelete;
		};
	});

	const roleColors: Record<string, string> = {
		PROJECT_MANAGEMENT: 'badge-primary',
		PARTICIPANT_CARE: 'badge-secondary',
		REVIEWER: 'badge-accent',
		MEMBER: 'badge-ghost',
		TEAM_COORDINATOR: 'badge-info'
	};

	const columns = [
		{
			key: 'family_name',
			title: m.familyName(),
			value: (row: (typeof teamMembers)[number]) => row.user.family_name,
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row: (typeof teamMembers)[number]) => row.user.given_name,
			sortable: true
		},
		{
			key: 'email',
			title: m.email(),
			value: (row: (typeof teamMembers)[number]) => row.user.email,
			sortable: true
		},
		{
			key: 'role',
			title: m.role(),
			value: (row: (typeof teamMembers)[number]) => translateTeamRole(row.role),
			sortable: true,
			parseHTML: true,
			renderValue: (row: (typeof teamMembers)[number]) =>
				`<span class="badge ${roleColors[row.role] ?? 'badge-ghost'}">${translateTeamRole(row.role)}</span>`
		},
		{
			key: 'profileStatus',
			title: m.profileStatus(),
			value: (row: (typeof teamMembers)[number]) =>
				isProfileComplete(row.user) ? m.complete() : m.incomplete(),
			sortable: true,
			parseHTML: true,
			renderValue: (row: (typeof teamMembers)[number]) => {
				const complete = isProfileComplete(row.user);
				return complete
					? `<span class="badge badge-success">${m.complete()}</span>`
					: `<span class="badge badge-warning" title="${m.profileIncompleteHint()}">${m.incomplete()}</span>`;
			}
		},
		{
			key: 'actions',
			title: '',
			value: () => '',
			parseHTML: true,
			renderValue: (row: (typeof teamMembers)[number]) => `
				<div class="flex gap-2 justify-end">
					<button class="btn btn-sm btn-error" onclick="window.handleTeamMemberDelete('${row.id}')" tooltip data-tip="${m.delete()}" title="${m.delete()}">
						<i class="fa-solid fa-trash"></i>
					</button>
				</div>
			`
		}
	];
</script>

<div class="flex flex-col gap-4 p-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">{m.teamMembers()}</h1>
		<div class="flex gap-2">
			<button class="btn btn-primary" onclick={() => (inviteMembersModalOpen = true)}>
				<i class="fa-duotone fa-envelope"></i>
				{m.inviteTeamMembers()}
			</button>
		</div>
	</div>

	<DataTable {columns} rows={teamMembers} />
</div>

{#if inviteMembersModalOpen}
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} conferenceId={data.conferenceId} />
{/if}
