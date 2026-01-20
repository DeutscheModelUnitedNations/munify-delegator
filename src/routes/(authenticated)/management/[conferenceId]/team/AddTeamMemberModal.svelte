<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import { cache, graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';

	interface Props {
		open: boolean;
		conferenceId: string;
	}

	let { open = $bindable(false), conferenceId }: Props = $props();

	let searchEmail = $state('');
	let selectedRole = $state('MEMBER');
	let foundUser = $state<{
		id: string;
		given_name: string;
		family_name: string;
		email: string;
	} | null>(null);
	let searchError = $state<string | null>(null);
	let isSearching = $state(false);

	const createTeamMemberMutation = graphql(`
		mutation CreateTeamMember($conferenceId: String!, $userId: String!, $role: TeamRole!) {
			createOneTeamMember(data: { conferenceId: $conferenceId, userId: $userId, role: $role }) {
				id
			}
		}
	`);

	const handleSearch = async () => {
		if (!searchEmail.trim()) return;
		isSearching = true;
		searchError = null;
		foundUser = null;
		try {
			const response = await fetch('/api/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query SearchUserByEmail($email: String!) {
							findUniqueUser(where: { email: $email }) {
								id
								given_name
								family_name
								email
							}
						}
					`,
					variables: { email: searchEmail.trim() }
				})
			});
			const result = await response.json();
			if (result.data?.findUniqueUser) {
				foundUser = result.data.findUniqueUser;
			} else {
				searchError = m.noUsersFound();
			}
		} catch {
			searchError = m.httpGenericError();
		} finally {
			isSearching = false;
		}
	};

	const handleAdd = async () => {
		if (!foundUser) {
			toast.error(m.noUsersFound());
			return;
		}

		const promise = createTeamMemberMutation.mutate({
			conferenceId,
			userId: foundUser.id,
			role: selectedRole as any
		});
		toast.promise(promise, {
			loading: m.addingTeamMember(),
			success: m.teamMemberAdded(),
			error: (err) => (err instanceof Error ? err.message : null) || m.addTeamMemberError()
		});
		await promise;
		cache.markStale();
		await invalidateAll();
		open = false;

		// Reset form
		searchEmail = '';
		selectedRole = 'MEMBER';
		foundUser = null;
		searchError = null;
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};
</script>

<Modal bind:open title={m.addTeamMember()}>
	<div class="flex flex-col gap-4">
		<FormFieldset title={m.searchByEmail()}>
			<div class="join">
				<input
					type="email"
					class="input input-bordered join-item flex-1"
					bind:value={searchEmail}
					onkeypress={handleKeyPress}
					placeholder="user@example.com"
				/>
				<button
					class="btn join-item"
					onclick={handleSearch}
					disabled={!searchEmail.trim() || isSearching}
					aria-label="search"
				>
					<i class="fa-solid {isSearching ? 'fa-spinner fa-spin' : 'fa-search'}"></i>
				</button>
			</div>

			{#if searchError}
				<div class="alert alert-warning">
					<i class="fa-solid fa-exclamation-triangle"></i>
					<span>{searchError}</span>
				</div>
			{/if}

			{#if foundUser}
				<div class="alert alert-success">
					<i class="fa-solid fa-user-check"></i>
					<span>{foundUser.given_name} {foundUser.family_name} ({foundUser.email})</span>
				</div>
			{/if}
		</FormFieldset>
		{#if foundUser}
			<FormFieldset title={m.role()}>
				<select class="select select-bordered" bind:value={selectedRole}>
					<option value="MEMBER">{m.teamRoleMember()}</option>
					<option value="REVIEWER">{m.teamRoleReviewer()}</option>
					<option value="PARTICIPANT_CARE">{m.teamRoleParticipantCare()}</option>
					<option value="PROJECT_MANAGEMENT">{m.teamRoleProjectManagement()}</option>
				</select>
			</FormFieldset>
		{/if}

		<div class="modal-action">
			<button class="btn" onclick={() => (open = false)}>{m.cancel()}</button>
			<button class="btn btn-primary" onclick={handleAdd} disabled={!foundUser}>
				{m.add()}
			</button>
		</div>
	</div>
</Modal>
