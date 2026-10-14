<script lang="ts">
	import { dev } from '$app/environment';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import AccentStripe from '$lib/components/AccentStripe.svelte';
	import CalendarDisplay from '$lib/components/calendar/CalendarDisplay.svelte';
	import { fetchCalendarDays } from '$lib/api/calendarDays';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const conferenceId = $derived(routeParams.conferenceId);
	const [conference, calendarDays] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				title: true,
				timezone: true
			}),
			fetchCalendarDays(conferenceId)
		])
	);

	const days = $derived(
		calendarDays.map((day) => ({
			...day,
			tracks: [...day.tracks].sort((a, b) => a.sortOrder - b.sortOrder),
			entries: [...day.entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
		}))
	);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}{conference.title} – {m.calendarSectionTitle()}</title>
</svelte:head>

<div class="flex w-full flex-col p-4">
	{#snippet heading()}
		<header class="flex flex-col gap-2">
			<AccentStripe />
			<h1 class="text-3xl font-bold tracking-tight">{m.calendarSectionTitle()}</h1>
			<p class="text-base-content/70">{conference.title}</p>
		</header>
	{/snippet}

	{#if days.length > 0}
		<CalendarDisplay {days} timezone={conference.timezone} {heading} />
	{:else}
		<div class="mb-6">{@render heading()}</div>
		<p class="text-base-content/60">{m.calendarSectionDescription()}</p>
	{/if}
</div>
