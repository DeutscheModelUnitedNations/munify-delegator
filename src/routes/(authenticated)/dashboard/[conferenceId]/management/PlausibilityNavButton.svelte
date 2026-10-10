<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import { m } from '$lib/paraglide/messages';
	import { duplicatesOfConference } from './plausibility/possibleDuplicatesWhere';

	/**
	 * The plausibility entry of the management menu, pinging while detected duplicate pairs wait
	 * for a decision. Live: a scan or a decision updates it. Readers who may not see the pairs
	 * (everyone but the care team) get an empty list, so for them it is a plain entry.
	 */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const open = $derived(
		await client.liveQuery.possibleDuplicates({
			__args: { where: { ...duplicatesOfConference(conferenceId), status: 'OPEN' } },
			id: true
		})
	);
	const count = $derived(open.length);
</script>

<NavMenuButton
	href="/dashboard/{conferenceId}/management/plausibility"
	icon="fa-shield-check"
	title={m.adminPlausibility()}
	attention={count > 0}
	attentionLabel={m.possibleDuplicatesUnreviewed({ count })}
/>
