<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		deadline: Date | string;
		conferenceTimezone: string;
	}

	let { deadline, conferenceTimezone }: Props = $props();

	let deadlineDate = $derived(deadline instanceof Date ? deadline : new Date(deadline));
	let isClosed = $derived(deadlineDate < new Date());

	let userTimezone = $derived(Intl.DateTimeFormat().resolvedOptions().timeZone);
	let timezoneDiffers = $derived(userTimezone !== conferenceTimezone);

	let conferenceTimeFormatted = $derived(
		deadlineDate.toLocaleString(undefined, {
			timeZone: conferenceTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		})
	);

	let userTimeFormatted = $derived(
		deadlineDate.toLocaleString(undefined, {
			timeZone: userTimezone,
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		})
	);
</script>

<div class="flex flex-col gap-0.5">
	<div class="flex items-center gap-2">
		{#if isClosed}
			<span class="badge badge-error badge-sm">{m.surveyClosed()}</span>
		{:else}
			<span class="badge badge-success badge-sm"
				>{m.surveyOpen({ deadline: conferenceTimeFormatted })}</span
			>
		{/if}
	</div>
	{#if timezoneDiffers && !isClosed}
		<span class="text-base-content/50 text-xs">
			{userTimeFormatted} ({m.yourTime()})
		</span>
	{/if}
</div>
