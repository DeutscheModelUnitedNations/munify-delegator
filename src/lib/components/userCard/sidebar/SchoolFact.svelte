<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Fact from '../Fact.svelte';

	/** The person's school in the conference. Only participant care reads the row it stands in. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			school: { name: true, city: true }
		})
	);
	const school = $derived(participants.at(0)?.school);
	const text = $derived([school?.name, school?.city].filter(Boolean).join(', '));
</script>

<Fact label={m.school()} value={text} />
