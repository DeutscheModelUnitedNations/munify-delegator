<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		deadline: Date | string;
		conferenceTimezone: string;
		/** A line of muted text instead of badges, for places where the deadline is secondary. */
		plain?: boolean;
	}

	let { deadline, conferenceTimezone, plain = false }: Props = $props();

	let deadlineDate = $derived(deadline instanceof Date ? deadline : new Date(deadline));
	let isClosed = $derived(deadlineDate < new Date());

	let userTimezone = $derived(Intl.DateTimeFormat().resolvedOptions().timeZone);
	let timezoneDiffers = $derived(userTimezone !== conferenceTimezone);

	let conferenceTimeFormatted = $derived(
		deadlineDate.toLocaleString(getLocale(), {
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
		deadlineDate.toLocaleString(getLocale(), {
			timeZone: userTimezone,
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		})
	);
</script>

{#if plain}
	<span class="text-base-content/60 flex flex-wrap items-center gap-x-1.5 text-xs">
		{#if isClosed}
			<i class="fa-sharp-duotone fa-solid fa-lock"></i>
			{m.surveyClosed()}
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-clock"></i>
			{m.surveyOpen({ deadline: conferenceTimeFormatted })}
			{#if timezoneDiffers}
				<span>({userTimeFormatted} {m.yourTime()})</span>
			{/if}
		{/if}
	</span>
{:else}
	<div class="flex flex-col gap-0.5">
		<div class="flex flex-col md:flex-row gap-2">
			{#if isClosed}
				<span class="badge badge-error badge-sm">{m.surveyClosed()}</span>
			{:else}
				<span class="badge badge-success badge-sm"
					>{m.surveyOpen({ deadline: conferenceTimeFormatted })}</span
				>
				{#if timezoneDiffers}
					<span class="badge badge-success badge-outline badge-sm">
						{userTimeFormatted} ({m.yourTime()})
					</span>
				{/if}
			{/if}
		</div>
	</div>
{/if}
