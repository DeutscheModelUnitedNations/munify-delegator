<script lang="ts">
	import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';
	import RegistrationStatusLight from '#lib/components/RegistrationStatusLight.svelte';
	import { getRegistrationStatus } from '#lib/utils/registrationStatus';
	import { getWaitingListStatus } from '#lib/helpers/waitingListStatus';

	interface Props {
		conference: {
			title: string;
			state: ConferencestateEnum;
			applicationDeadline: Date;
			totalSeats: number;
			totalParticipants: number;
			waitingListLength: number;
		};
	}

	let { conference }: Props = $props();

	let registrationStatus = $derived(
		getRegistrationStatus({
			conferenceState: conference.state,
			applicationDeadline: new Date(conference.applicationDeadline)
		})
	);

	let waitingListStatus = $derived(
		getWaitingListStatus({
			seats: conference.totalSeats,
			participants: conference.totalParticipants,
			listEntries: conference.waitingListLength
		})
	);
</script>

{#if registrationStatus !== 'CLOSED'}
	<div class="flex items-center gap-2">
		<RegistrationStatusLight size="lg" {waitingListStatus} {registrationStatus} />
		{conference.title}
	</div>
{/if}
