<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from './CommitteeAssignmentModal.svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import codenmz from '$lib/helpers/codenamize';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';

	interface Props {
		conferenceId: string;
		delegationId: string;
		open?: boolean;
		onClose?: () => void;
		userData: PageData['user'];
	}
	let { delegationId, open = $bindable(false), onClose, conferenceId, userData }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	function fetchDelegation(id: string) {
		return client.query.delegation({
			__args: { id },
			applied: true,
			entryCode: true,
			school: true,
			motivation: true,
			experience: true,
			members: {
				id: true,
				isHeadDelegate: true,
				user: person,
				assignedCommittee: { id: true, abbreviation: true, name: true },
				supervisors: { id: true, plansOwnAttendenceAtConference: true, user: person }
			},
			appliedForRoles: {
				id: true,
				nonStateActor: { name: true },
				nation: { alpha3Code: true }
			},
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { id: true, abbreviation: true, name: true, fontAwesomeIcon: true }
		});
	}

	let delegation = $state<Awaited<ReturnType<typeof fetchDelegation>>>();
	let loading = $state(false);

	async function loadDelegation(id: string) {
		loading = true;
		try {
			delegation = await fetchDelegation(id);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (delegationId) {
			void loadDelegation(delegationId);
		}
	});

	let members = $derived(
		delegation?.members.toSorted((a, b) => {
			const bothNames = (x: typeof a) => (x.user.familyName ?? '') + (x.user.givenName ?? '');
			return bothNames(a).localeCompare(bothNames(b));
		})
	);
	let supervisors = $derived(
		delegation?.members
			.flatMap((m) => m.supervisors)
			.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
	);

	type MemberType = NonNullable<typeof members>[number];

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
	let selectedMember = $state<MemberType | null>(null);
	let isUpdatingHeadDelegate = $state(false);

	async function handleConfirmHeadDelegate() {
		if (!selectedMember || selectedMember.isHeadDelegate) return;
		isUpdatingHeadDelegate = true;
		try {
			await client.mutate.updateDelegation({
				__args: { id: delegationId, newHeadDelegateUserId: selectedMember.user.id },
				id: true,
				members: { id: true, isHeadDelegate: true }
			});
			await loadDelegation(delegationId);
			await invalidateAll();
		} catch (error) {
			console.error('Failed to update head delegate:', error);
		} finally {
			isUpdatingHeadDelegate = false;
			headDelegateModalOpen = false;
			selectedMember = null;
		}
	}

	const changeSchool = async () => {
		const newSchool = prompt(m.enterNewSchoolName());
		if (!newSchool) return;

		try {
			const promise = client.mutate.updateDelegation({
				__args: { id: delegationId, school: newSchool },
				id: true,
				school: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await loadDelegation(delegationId);
			await invalidateAll();
		} catch (error) {
			console.error('Failed to change school name:', error);
		}
	};
</script>

<Drawer
	bind:open
	{onClose}
	id={delegationId}
	title={codenmz(delegationId)}
	category={m.delegation()}
	{loading}
>
	{#if delegation?.assignedNation}
		<div class="alert">
			<Flag alpha2Code={delegation?.assignedNation.alpha2Code} />
			<h3 class="text-xl font-bold">
				{getFullTranslatedCountryNameFromISO3Code(delegation?.assignedNation.alpha3Code)}
			</h3>
		</div>
	{:else if delegation?.assignedNonStateActor}
		<div class="alert">
			<Flag nsa icon={delegation?.assignedNonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'} />
			{delegation?.assignedNonStateActor.name}
		</div>
	{:else if delegation?.applied}
		<div class="alert alert-success">
			<i class="fas fa-check"></i>
			{m.registrationCompleted()}
		</div>
	{:else}
		<div class="alert alert-warning">
			<i class="fas fa-hourglass-half"></i>
			{m.registrationNotCompleted()}
		</div>
	{/if}

	<div class="flex flex-col">
		<h3 class="text-xl font-bold">{m.adminUserCardDetails()}</h3>
		<table class="table">
			<thead>
				<tr>
					<th></th>
					<th class="w-full"></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-qrcode text-lg"></i></td>
					<td class="font-mono">
						{delegation?.entryCode}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
					<td>
						<div class="flex items-center">
							<div class="w-full flex-1">
								{delegation?.school}
							</div>
							<button class="btn btn-xs ml-2" onclick={changeSchool} aria-label="Edit School">
								<i class="fa-duotone fa-pencil"></i>
							</button>
						</div>
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
					<td>
						{delegation?.motivation}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
					<td>
						{delegation?.experience}
					</td>
				</tr>
				<tr>
					<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
					<td>
						<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
							>{delegation?.appliedForRoles.length}</span
						>
						{delegation?.appliedForRoles
							.map((x) => {
								if (x.nation) return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
								if (x.nonStateActor) return x.nonStateActor.name;
								return 'N/A';
							})
							.join(', ')}
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.delegationMembers()}</h3>
		{#if members?.length === 0}
			<div class="alert alert-warning">
				<i class="fa-solid fa-info-circle"></i>
				{m.noMembersFound()}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each members ?? [] as member, i (i)}
						<tr>
							<td>
								{#if member.isHeadDelegate}
									<i class="fa-duotone fa-medal text-lg"></i>
								{/if}
							</td>
							<td>
								<span class="capitalize">{member.user.givenName}</span>
								<span class="uppercase">{member.user.familyName}</span>
							</td>
							<td>
								{#if member.assignedCommittee}
									<span class="text-xs">{member.assignedCommittee.abbreviation}</span>
								{:else}
									<i class="fa-duotone fa-dash"></i>
								{/if}
							</td>
							<td>
								<button
									class="btn btn-ghost btn-sm btn-square"
									onclick={() => {
										if (member.user?.id) openUserCard(member.user.id, conferenceId);
									}}
									aria-label="Details"
								>
									<i class="fa-duotone fa-id-card"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.supervisors()}</h3>

		{#if !supervisors || supervisors.length === 0}
			<div class="alert alert-info">
				<i class="fa-solid fa-user-slash"></i>
				{m.noSupervisors()}
			</div>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th></th>
						<th class="w-full"></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each supervisors as supervisor, i (i)}
						<tr>
							<td>
								{#if supervisor.plansOwnAttendenceAtConference}
									<i class="fa-duotone fa-location-check text-lg"></i>
								{:else}
									<i class="fa-duotone fa-cloud text-lg"></i>
								{/if}
							</td>
							<td>
								<span class="capitalize">{supervisor.user.givenName}</span>
								<span class="uppercase">{supervisor.user.familyName}</span>
							</td>
							<td>
								<a
									class="btn btn-sm"
									href="/management/{conferenceId}/supervisors?selected={supervisor.id}"
									aria-label="Details"
								>
									<i class="fa-duotone fa-arrow-up-right-from-square"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.adminActions()}</h3>
		<button
			class="btn"
			onclick={async () => {
				if (!confirm(m.confirmRotateCode())) return;
				await client.mutate.updateDelegation({
					__args: { id: delegationId, resetEntryCode: true },
					id: true,
					entryCode: true
				});
				await loadDelegation(delegationId);
			}}
		>
			<i class="fa-duotone fa-arrow-rotate-left"></i>
			{m.rotateCode()}
		</button>
		<button
			class="btn {members?.length === 0 && 'disabled'}"
			onclick={() => (committeeAssignmentModalOpen = true)}
		>
			<i class="fa-duotone fa-grid-2"></i>
			{m.committeeAssignment()}
		</button>
		{#if userData?.myOIDCRoles?.includes('admin')}
			<button
				class="btn"
				onclick={() => {
					selectedMember = members?.find((m) => m.isHeadDelegate) ?? null;
					headDelegateModalOpen = true;
				}}
			>
				<i class="fa-duotone fa-medal"></i>
				{m.headDelegate ? m.headDelegate() : 'Change Head Delegate'}
			</button>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<button
			class="btn {!delegation?.applied && 'btn-disabled'} btn-error"
			onclick={async () => {
				if (!confirm(m.confirmRevokeApplication())) return;
				const promise = client.mutate.updateDelegation({
					__args: { id: delegationId, applied: false },
					id: true,
					applied: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
				await loadDelegation(delegationId);
				await invalidateAll();
			}}
		>
			<i class="fas fa-file-slash"></i>
			{m.revokeApplication()}
		</button>
	</div>
</Drawer>

<!-- Head Delegate Selection Modal -->
<div class="modal" class:modal-open={headDelegateModalOpen}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">{m.headDelegate ? m.headDelegate() : m.delegationMembers()}</h3>
		<div class="max-h-60 overflow-y-auto">
			{#each members ?? [] as member, i (i)}
				<label class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded-md p-2">
					<input
						type="radio"
						name="head-delegate"
						checked={selectedMember?.id === member.id}
						onclick={() => (selectedMember = member)}
						disabled={member.isHeadDelegate || isUpdatingHeadDelegate}
						class="radio"
					/>
					<span>{member.user.givenName} {member.user.familyName}</span>
					{#if member.isHeadDelegate}
						<span class="badge badge-primary">
							<i class="fas fa-medal"></i>
						</span>
					{/if}
				</label>
			{/each}
		</div>
		<div class="modal-action">
			<button
				class="btn"
				onclick={() => {
					selectedMember = null;
					headDelegateModalOpen = false;
				}}
				disabled={isUpdatingHeadDelegate}>{m.close ? m.close() : 'Cancel'}</button
			>
			<button
				class="btn btn-primary"
				onclick={handleConfirmHeadDelegate}
				disabled={!selectedMember || selectedMember.isHeadDelegate || isUpdatingHeadDelegate}
			>
				{#if isUpdatingHeadDelegate}
					<span class="loading loading-spinner"></span>
				{/if}
				{m.confirm()}
			</button>
		</div>
	</div>
</div>

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nation={delegation?.assignedNation}
	{conferenceId}
/>
