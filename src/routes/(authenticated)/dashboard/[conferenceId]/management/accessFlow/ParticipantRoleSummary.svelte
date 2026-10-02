<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		conferenceId: string;
		userId: string;
		/** Rendered between the flag and the role badges, e.g. the person's name. */
		children: Snippet;
	}

	let { conferenceId, userId, children }: Props = $props();

	/** What the person is in this conference: a seat in a delegation, a role, or a supervisor. */
	async function fetchRoles(inConference: string, ofUser: string) {
		const forUser = { conferenceId: { eq: inConference }, userId: { eq: ofUser } };
		const [delegationMembers, supervisors, singleParticipants] = await Promise.all([
			client.liveQuery.delegationMembers({
				__args: { where: forUser },
				id: true,
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { name: true, fontAwesomeIcon: true }
				},
				assignedCommittee: { abbreviation: true }
			}),
			client.liveQuery.conferenceSupervisors({ __args: { where: forUser }, id: true }),
			client.liveQuery.singleParticipants({
				__args: { where: forUser },
				id: true,
				assignedRole: { name: true }
			})
		]);
		return {
			get delegationMember() {
				return delegationMembers.at(0) ?? null;
			},
			get isSupervisor() {
				return supervisors.length > 0;
			},
			get singleParticipant() {
				return singleParticipants.at(0) ?? null;
			}
		};
	}

	const roles = $derived(await fetchRoles(conferenceId, userId));
	const delegationMember = $derived(roles.delegationMember);
	const singleParticipant = $derived(roles.singleParticipant);
	const isSupervisor = $derived(roles.isSupervisor);
</script>

<div class="flex items-start gap-4">
	<!-- Flag -->
	{#if delegationMember?.delegation?.assignedNation}
		<Flag alpha2Code={delegationMember.delegation.assignedNation.alpha2Code} size="sm" />
	{:else if delegationMember?.delegation?.assignedNonStateActor}
		<Flag nsa icon={delegationMember.delegation.assignedNonStateActor.fontAwesomeIcon} size="sm" />
	{/if}

	<div class="flex flex-1 flex-col gap-2">
		{@render children()}

		<!-- Role / Committee / Nation badges -->
		<div class="mt-1 flex flex-wrap gap-2">
			{#if delegationMember?.assignedCommittee}
				<span class="badge badge-soft badge-primary">
					{delegationMember.assignedCommittee.abbreviation}
				</span>
			{/if}
			{#if delegationMember?.delegation?.assignedNation}
				<span class="badge badge-soft badge-secondary">
					{getFullTranslatedCountryNameFromISO3Code(
						delegationMember.delegation.assignedNation.alpha3Code
					)}
				</span>
			{/if}
			{#if delegationMember?.delegation?.assignedNonStateActor}
				<span class="badge badge-soft badge-secondary">
					{delegationMember.delegation.assignedNonStateActor.name}
				</span>
			{/if}
			{#if singleParticipant?.assignedRole}
				<span class="badge badge-soft badge-accent">
					{singleParticipant.assignedRole.name}
				</span>
			{/if}
			{#if isSupervisor}
				<span class="badge badge-soft badge-warning">
					{m.supervisor()}
				</span>
			{/if}
		</div>
	</div>
</div>
