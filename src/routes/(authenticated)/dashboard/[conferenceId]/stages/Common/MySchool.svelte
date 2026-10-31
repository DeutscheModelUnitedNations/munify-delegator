<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import SchoolLine from '#lib/components/userCard/sections/SchoolLine.svelte';

	/**
	 * The caller's own school in the conference (`conferenceParticipant.school`), which they may
	 * change at any time: delegates, single participants and supervisors alike, since a delegation
	 * or a registration keeps no school of its own.
	 */
	interface Props {
		conferenceId: string;
		hint?: string;
	}

	let { conferenceId, hint }: Props = $props();

	const user = await getCurrentUser();
	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
			school: { id: true, name: true, city: true }
		})
	);
</script>

<SchoolLine
	school={participants.at(0)?.school}
	{hint}
	save={(choice) =>
		client.mutate.setParticipantSchool({ __args: { conferenceId, ...choice }, id: true })}
/>
