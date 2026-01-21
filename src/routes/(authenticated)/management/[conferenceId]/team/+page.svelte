<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import AddTeamMemberModal from './AddTeamMemberModal.svelte';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import { cache, graphql } from '$houdini';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	const teamQuery = data.TeamMembersQuery;
	let teamMembers = $derived($teamQuery.data?.findManyTeamMembers ?? []);

	let addMemberModalOpen = $state(false);

	const deleteTeamMemberMutation = graphql(`
		mutation DeleteTeamMember($id: String!) {
			deleteOneTeamMember(where: { id: $id }) {
				id
			}
		}
	`);

	const startImpersonationMutation = graphql(`
		mutation StartImpersonationFromTeam($targetUserId: String!) {
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
		(window as any).handleTeamMemberDelete = handleDelete;
		(window as any).handleTeamMemberImpersonate = handleImpersonate;
		return () => {
			delete (window as any).handleTeamMemberDelete;
			delete (window as any).handleTeamMemberImpersonate;
		};
	});

	const roleColors: Record<string, string> = {
		PROJECT_MANAGEMENT: 'badge-primary',
		PARTICIPANT_CARE: 'badge-secondary',
		REVIEWER: 'badge-accent',
		MEMBER: 'badge-ghost'
	};

	const columns = [
		{
			key: 'family_name',
			title: m.familyName(),
			value: (row) => row.user.family_name,
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row) => row.user.given_name,
			sortable: true
		},
		{
			key: 'email',
			title: m.email(),
			value: (row) => row.user.email,
			sortable: true
		},
		{
			key: 'role',
			title: m.role(),
			value: (row) => translateTeamRole(row.role),
			sortable: true,
			parseHTML: true,
			renderValue: (row) =>
				`<span class="badge ${roleColors[row.role] ?? 'badge-ghost'}">${translateTeamRole(row.role)}</span>`
		},
		{
			key: 'actions',
			title: '',
			value: () => '',
			parseHTML: true,
			renderValue: (row) => `
				<div class="flex gap-2 justify-end">
					<button class="btn btn-sm" onclick="window.handleTeamMemberImpersonate('${row.user.id}')" tooltip data-tip="${m.impersonation()}" title="${m.impersonation()}">
						<i class="fa-duotone fa-user-secret"></i>
					</button>
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
		<h1 class="text-3xl font-bold">{m.teamManagement()}</h1>
		<button class="btn btn-primary" onclick={() => (addMemberModalOpen = true)}>
			<i class="fa-solid fa-plus"></i>
			{m.addTeamMember()}
		</button>
	</div>

	<DataTable {columns} rows={teamMembers} />
</div>

{#if addMemberModalOpen}
	<AddTeamMemberModal bind:open={addMemberModalOpen} conferenceId={data.conferenceId} />
{/if}
