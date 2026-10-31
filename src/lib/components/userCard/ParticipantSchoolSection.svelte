<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import SchoolLine from './sections/SchoolLine.svelte';

	/**
	 * The person's own school in the conference (`conferenceParticipant.school`), the only school a
	 * person taking part has: what the seats and numbers per school count, and what stays theirs
	 * when the assignment merges delegations of several schools. Participant care corrects it here,
	 * and opens the school's page from it: only participant care reads the row, the same roles the
	 * schools pages want.
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
			school: { id: true, name: true, city: true }
		})
	);
	// No row yet: the person has no part in the conference to give a school to
	const participant = $derived(participants.at(0));
	const participantId = $derived(participant?.id);
	const school = $derived(participant?.school);
</script>

{#if participantId}
	{@const id = participantId}
	<section class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.participantSchool()}</h3>
		<div class="bg-base-200 rounded-box">
			<SchoolLine
				{school}
				href={school ? resolve(`dashboard/${conferenceId}/team/schools/${school.id}`) : undefined}
				save={(choice) =>
					Promise.resolve(
						client.mutate.setParticipantSchool({
							__args: { conferenceId, id, ...choice },
							id: true
						})
					)}
			/>
		</div>
	</section>
{/if}
