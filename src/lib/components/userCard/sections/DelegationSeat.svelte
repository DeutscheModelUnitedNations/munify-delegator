<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import codenmz from '#lib/helpers/codenamize';
	import Flag from '#lib/components/Flag.svelte';
	import CommitteeAssignmentModal from '#lib/components/registrationAdmin/CommitteeAssignmentModal.svelte';
	import HeadDelegateModal from '#lib/components/registrationAdmin/HeadDelegateModal.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';
	import MakeSupervisorNotice from './MakeSupervisorNotice.svelte';
	import DelegationMembersTable from './DelegationMembersTable.svelte';

	/** The delegation's role, the person's committee in it, and who else is in it. */
	interface Props {
		delegationId: string;
		conferenceId: string;
		userId: string;
	}

	let { delegationId, conferenceId, userId }: Props = $props();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			id: true,
			applied: true,
			assignedRole: {
				id: true,
				kind: true,
				name: true,
				abbreviation: true,
				icon: true,
				nation: { alpha2Code: true, alpha3Code: true }
			},
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true },
				assignedCommittee: { id: true, abbreviation: true, name: true }
			}
		})
	);
	const members = $derived(
		delegation.members.toSorted((a, b) => {
			const fullName = (x: typeof a) => `${x.user.familyName ?? ''}${x.user.givenName ?? ''}`;
			return fullName(a).localeCompare(fullName(b));
		})
	);
	const currentMember = $derived(delegation.members.find((member) => member.user.id === userId));
	const role = $derived(splitRole(delegation.assignedRole));
	const nation = $derived(role.nation);
	const nonStateActor = $derived(role.nonStateActor);

	let committeeAssignmentModalOpen = $state(false);
	let headDelegateModalOpen = $state(false);
</script>

<section class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.delegation()} {codenmz(delegationId)}</h3>

	{#if currentMember}
		<MakeSupervisorNotice {conferenceId} member={currentMember} />
	{/if}

	<div class="bg-base-200 rounded-box p-4">
		<div class="flex items-center gap-3">
			{#if nation}
				<Flag alpha2Code={nation.alpha2Code} size="xs" />
				<span class="text-lg font-bold">
					{getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)}
				</span>
			{:else if nonStateActor}
				<Flag nsa icon={nonStateActor.icon ?? 'hand-pointing'} size="xs" />
				<span class="text-lg font-bold">
					{nonStateActor.name}
					({nonStateActor.abbreviation})
				</span>
			{:else}
				<NoAssignmentNotice applied={delegation.applied} />
			{/if}
		</div>
		{#if nation && currentMember}
			<div class="mt-3 flex items-center gap-1 text-sm">
				<span class="text-base-content/60">{m.committee()}:</span>
				{#if currentMember.assignedCommittee}
					<span class="font-medium">
						{currentMember.assignedCommittee.name}
						({currentMember.assignedCommittee.abbreviation})
					</span>
				{:else}
					<span class="text-base-content/60 italic">N/A</span>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-2">
		{#if nation}
			<button
				class="btn btn-sm"
				disabled={members.length === 0}
				onclick={() => (committeeAssignmentModalOpen = true)}
			>
				<i aria-hidden="true" class="ph-duotone ph-squares-four"></i>
				{m.committeeAssignment()}
			</button>
		{/if}
		<button class="btn btn-sm" onclick={() => (headDelegateModalOpen = true)}>
			<i aria-hidden="true" class="ph-duotone ph-medal"></i>
			{m.headDelegate()}
		</button>
	</div>

	<DelegationMembersTable {members} {userId} />
</section>

<HeadDelegateModal bind:open={headDelegateModalOpen} {delegationId} {members} />

<CommitteeAssignmentModal
	bind:open={committeeAssignmentModalOpen}
	{members}
	nationRoleId={nation ? delegation.assignedRole?.id : null}
	{conferenceId}
/>
