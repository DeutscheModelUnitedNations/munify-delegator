<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import DataTable from '$lib/components/dataTable/DataTable.svelte';
	import InviteTeamMembersModal from '$lib/components/teamManagement/InviteTeamMembersModal.svelte';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import { client } from '$lib/api/rumbleClient/client';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const teamMembers = $derived(
		await client.liveQuery.teamMembers({
			__args: { where: { conferenceId: { eq: params.conferenceId } } },
			id: true,
			role: true,
			user: {
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				birthday: true,
				phone: true,
				street: true,
				zip: true,
				city: true,
				country: true,
				gender: true,
				foodPreference: true
			}
		})
	);
	const isAdmin = $derived((await getCurrentUser()).isAdmin);

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

	const handleImpersonate = async (userId: string) => {
		try {
			const promise = Promise.resolve(
				client.mutate.startImpersonation({ __args: { targetUserId: userId } })
			);
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await goto('/dashboard');
			window.location.reload();
		} catch (error) {
			console.error('Failed to start impersonation:', error);
			toast.error(m.impersonationFailed());
		}
	};

	const handleOpenUserCard = (userId: string) => {
		openUserCard(userId, params.conferenceId);
	};

	// Expose functions globally for onclick handlers in rendered HTML
	onMount(() => {
		window.handleTeamMemberDelete = handleDelete;
		window.handleTeamMemberImpersonate = handleImpersonate;
		window.handleTeamMemberOpenUserCard = handleOpenUserCard;
		return () => {
			delete window.handleTeamMemberDelete;
			delete window.handleTeamMemberImpersonate;
			delete window.handleTeamMemberOpenUserCard;
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
			value: (row: (typeof teamMembers)[number]) => row.user.familyName,
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row: (typeof teamMembers)[number]) => row.user.givenName,
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
					<button class="btn btn-ghost btn-sm btn-square" onclick="window.handleTeamMemberOpenUserCard('${row.user.id}')" title="${m.adminUserCard()}">
						<i class="fa-duotone fa-id-card"></i>
					</button>
					${
						isAdmin && IMPERSONATION_ENABLED
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
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} conferenceId={params.conferenceId} />
{/if}
