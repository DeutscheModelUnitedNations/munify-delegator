<script lang="ts">
	import type { ConferencesPreview$result } from '$houdini';
	import RegistrationStatusLight from '$lib/components/RegistrationStatusLight.svelte';
	import { getRegistrationStatus } from '$lib/services/registrationStatus';
	import { getWaitingListStatus } from '$lib/services/waitingListStatus';

	interface Props {
		conference: NonNullable<ConferencesPreview$result['findManyConferences']>[number];
	}

	let { conference }: Props = $props();

	let registrationStatus = $derived(
		getRegistrationStatus(conference.state, new Date(conference.startAssignment))
	);

	let waitingListStatus = $derived(
		getWaitingListStatus(
			conference.totalSeats,
			conference.totalParticipants,
			conference.waitingListLength
		)
	);
</script>

{#if registrationStatus !== 'CLOSED'}
	<div class="flex items-center gap-2">
		<RegistrationStatusLight size="lg" {waitingListStatus} {registrationStatus} />
		{conference.title}
	</div>
{/if}
