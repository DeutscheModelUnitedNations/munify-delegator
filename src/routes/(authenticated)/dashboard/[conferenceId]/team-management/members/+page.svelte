<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import InviteTeamMembersModal from '$lib/components/TeamManagement/InviteTeamMembersModal.svelte';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import { cache, graphql } from '$houdini';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import type { PageData } from './$houdini';
	import { z } from 'zod';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	let { data }: { data: PageData } = $props();

	const teamQuery = data.TeamManagementMembersQuery;
	let teamMembers = $derived($teamQuery.data?.findManyTeamMembers ?? []);
	let isAdmin = data.isAdmin;

	let inviteMembersModalOpen = $state(false);

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
		birthday: string | null;
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

	const deleteTeamMemberMutation = graphql(`
		mutation DeleteTeamMemberFromManagement($id: String!) {
			deleteOneTeamMember(where: { id: $id }) {
				id
			}
		}
	`);

	const startImpersonationMutation = graphql(`
		mutation StartImpersonationFromTeamManagement($targetUserId: String!) {
			startImpersonation(targetUserId: $targetUserId)
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

	const handleImpersonate = async (userId: string) => {
		try {
			const promise = startImpersonationMutation.mutate({ targetUserId: userId });
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await goto('/dashboard');
			window.location.reload();
		} catch (error) {
			console.error('Failed to start impersonation:', error);
			toast.error(m.impersonationFailed());
		}
	};

	// Expose functions globally for onclick handlers in rendered HTML
	onMount(() => {
		window.handleTeamMemberDelete = handleDelete;
		window.handleTeamMemberImpersonate = handleImpersonate;
		return () => {
			delete window.handleTeamMemberDelete;
			delete window.handleTeamMemberImpersonate;
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
					${
						isAdmin
							? `<button class="btn btn-sm" onclick="window.handleTeamMemberImpersonate('${row.user.id}')" title="${m.impersonation()}">
							<i class="fa-duotone fa-user-secret"></i>
						</button>`
							: ''
					}
					<button class="btn btn-sm btn-error" onclick="window.handleTeamMemberDelete('${row.id}')" title="${m.delete()}">
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
