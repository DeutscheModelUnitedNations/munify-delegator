<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '$lib/components/registrationAdmin/CommitteeAssignmentModal.svelte';
	import HeadDelegateModal from '$lib/components/registrationAdmin/HeadDelegateModal.svelte';
	import SupervisorLinkTable from '$lib/components/registrationAdmin/SupervisorLinkTable.svelte';
	import codenmz from '$lib/helpers/codenamize';
	import { changeDelegationSchool, revokeDelegationApplication } from '$lib/api/delegationActions';
	import ApplicationStatusAlert from '$lib/components/registrationAdmin/ApplicationStatusAlert.svelte';
	import DetailsTable from '$lib/components/registrationAdmin/DetailsTable.svelte';
	import DetailRow from '$lib/components/registrationAdmin/DetailRow.svelte';
	import { resolve } from '$app/paths';
	import StarRating from '$lib/components/StarRating.svelte';
	import { fetchReviewOf } from '../assignment/board';
	import UserCardButton from '$lib/components/registrationAdmin/UserCardButton.svelte';

	interface Props {
		conferenceId: string;
		delegationId: string;
		open?: boolean;
		onClose?: () => void;
	}
	let { delegationId, open = $bindable(false), onClose, conferenceId }: Props = $props();

	const currentUser = await getCurrentUser();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			id: true,
			applied: true,
			entryCode: true,
			school: true,
			motivation: true,
			experience: true,
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true },
				assignedCommittee: { id: true, abbreviation: true },
				supervisors: {
					id: true,
					plansOwnAttendenceAtConference: true,
					user: { givenName: true, familyName: true }
				}
			},
			appliedForRoles: {
				id: true,
				nonStateActor: { name: true },
				nation: { alpha3Code: true }
			},
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true }
		})
	);

	const evaluation = $derived((await fetchReviewOf(conferenceId, { delegationId }))?.evaluation);

	let members = $derived(
		delegation.members.toSorted((a, b) => {
			const bothNames = (x: typeof a) => (x.user.familyName ?? '') + (x.user.givenName ?? '');
			return bothNames(a).localeCompare(bothNames(b));
		})
	);
	let supervisors = $derived(
		delegation.members
			.flatMap((m) => m.supervisors)
			.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
	);

	const appliedForRoleNames = $derived(
		delegation.appliedForRoles
			.map((x) => {
				if (x.nation) return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
				if (x.nonStateActor) return x.nonStateActor.name;
				return 'N/A';
			})
			.join(', ')
	);

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
</script>

{#snippet memberRow(member: (typeof members)[number])}
	<tr>
		<td>
			{#if member.isHeadDelegate}
				<i class="fa-sharp-duotone fa-solid fa-medal text-lg"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-dash"></i>
			{/if}
		</td>
		<td>
			<UserCardButton userId={member.user.id} />
		</td>
	</tr>
{/snippet}

<Drawer
	bind:open
	{onClose}
	id={delegationId}
	title={codenmz(delegationId)}
	category={m.delegation()}
	loading={false}
>
	{#if delegation.assignedNation}
		<div class="alert">
			<Flag alpha2Code={delegation.assignedNation.alpha2Code} />
			<h3 class="text-xl font-bold">
				{getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)}
			</h3>
		</div>
	{:else if delegation.assignedNonStateActor}
		<div class="alert">
			<Flag nsa icon={delegation.assignedNonStateActor.fontAwesomeIcon ?? 'fa-hand-point-up'} />
			{delegation.assignedNonStateActor.name}
		</div>
	{:else}
		<ApplicationStatusAlert applied={delegation.applied} />
	{/if}

	<DetailsTable>
		<DetailRow icon="fa-qrcode" class="font-mono">{delegation.entryCode}</DetailRow>
		<DetailRow icon="fa-school">
			<div class="flex items-center">
				<div class="w-full flex-1">
					{delegation.school}
				</div>
				<button
					class="btn btn-xs ml-2"
					onclick={() => changeDelegationSchool(delegationId)}
					aria-label="Edit School"
				>
					<i class="fa-sharp-duotone fa-solid fa-pencil"></i>
				</button>
			</div>
		</DetailRow>
		{#if delegation.applied}
			<DetailRow icon="fa-star">
				<div class="flex items-center justify-between gap-2">
					<StarRating rating={evaluation ?? 0} size="md" />
					<a
						class="btn btn-xs"
						href="{resolve(
							'/(authenticated)/dashboard/[conferenceId]/management/assignment/sighting',
							{
								conferenceId
							}
						)}?application={delegationId}"
						aria-label={m.assignmentTabSighting()}
					>
						<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
					</a>
				</div>
			</DetailRow>
		{/if}
		<DetailRow icon="fa-fire-flame-curved">{delegation.motivation}</DetailRow>
		<DetailRow icon="fa-compass">{delegation.experience}</DetailRow>
		<DetailRow icon="fa-flag">
			<span class="bg-base-300 mr-1 rounded-field px-3 py-0.5"
				>{delegation.appliedForRoles.length}</span
			>
			{appliedForRoleNames}
		</DetailRow>
	</DetailsTable>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.delegationMembers()}</h3>
		{#if members.length === 0}
			<div class="alert alert-warning">
				<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
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
					{#each members as member (member.id)}
						{@render memberRow(member)}
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<SupervisorLinkTable {conferenceId} {supervisors} />

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
			}}
		>
			<i class="fa-sharp-duotone fa-solid fa-arrow-rotate-left"></i>
			{m.rotateCode()}
		</button>
		<button
			class="btn {members.length === 0 && 'disabled'}"
			onclick={() => (committeeAssignmentModalOpen = true)}
		>
			<i class="fa-sharp-duotone fa-solid fa-grid-2"></i>
			{m.committeeAssignment()}
		</button>
		{#if currentUser.myOIDCRoles?.includes('admin')}
			<button class="btn" onclick={() => (headDelegateModalOpen = true)}>
				<i class="fa-sharp-duotone fa-solid fa-medal"></i>
				{m.headDelegate()}
			</button>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-bold">{m.dangerZone()}</h3>
		<button
			class="btn {!delegation.applied && 'btn-disabled'} btn-error"
			onclick={() => revokeDelegationApplication(delegationId)}
		>
			<i class="fas fa-file-slash"></i>
			{m.revokeApplication()}
		</button>
	</div>
</Drawer>

<HeadDelegateModal bind:open={headDelegateModalOpen} {delegationId} {members} />

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nation={delegation.assignedNation}
	{conferenceId}
/>
