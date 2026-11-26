<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { isOpen } from './formalities';
	import { fetchStatusWithAge, personFormalities } from './tabs/participantStatus';

	/** The formalities tab's icon: a green check once the person has settled them all. */
	interface Props {
		icon: string;
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { icon, userId, conferenceId, isConferenceSupervisor }: Props = $props();

	const data = $derived(await fetchStatusWithAge({ userId, conferenceId }));
	const complete = $derived(
		data.statuses.length > 0 && !personFormalities({ data, isConferenceSupervisor }).some(isOpen)
	);
</script>

{#if complete}
	<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-lg"></i>
	<span class="sr-only">{m.userCardFormalitiesDone()}:</span>
{:else}
	<i aria-hidden="true" class="ph-duotone {icon} text-lg"></i>
{/if}
