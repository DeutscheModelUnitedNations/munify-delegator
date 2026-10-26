<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import SchoolLine from './sections/SchoolLine.svelte';

	/**
	 * The person's own school in the conference (`conferenceParticipant.school`): what the seats and
	 * numbers per school count, and what stays theirs when the assignment merges delegations of
	 * several schools. Participant care corrects it here.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			id: true,
			school: { id: true, name: true, city: true },
			delegationMember: { id: true },
			singleParticipant: { id: true, school: { id: true } },
			conferenceSupervisor: { id: true, school: { id: true } }
		})
	);
	// No row yet: the person has no part in the conference to give a school to
	const participant = $derived(participants.at(0));
	const participantId = $derived(participant?.id);
	const school = $derived(participant?.school);

	/**
	 * A single participant's or supervisor's school change is the person's too, so while both agree
	 * the registration's row above already says it all. A delegation member's school can part from
	 * the delegation's (a merge, a member from another school), so it always stays visible there.
	 */
	const sameAsRegistration = $derived.by(() => {
		if (!participant || participant.delegationMember) return false;
		const registration = participant.singleParticipant ?? participant.conferenceSupervisor;
		return !!registration && (registration.school?.id ?? null) === (school?.id ?? null);
	});
</script>

{#if participantId && !sameAsRegistration}
	{@const id = participantId}
	<section class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.participantSchool()}</h3>
		<div class="bg-base-200 rounded-box">
			<SchoolLine
				{school}
				hint={m.participantSchoolHint()}
				save={(choice) =>
					Promise.resolve(
						client.mutate.setParticipantSchool({ __args: { id, ...choice }, id: true })
					)}
			/>
		</div>
	</section>
{/if}
