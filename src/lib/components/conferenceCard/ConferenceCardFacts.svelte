<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		conference: {
			startConference: Date | string;
			endConference: Date | string;
			startAssignment: Date | string;
			location?: string | null;
			language?: string | null;
			website?: string | null;
		};
		showDeadline: boolean;
	}

	let { conference, showDeadline }: Props = $props();

	interface Fact {
		label: string;
		value: string;
		href?: string;
	}

	let baseFacts: Fact[] = $derived([
		{
			label: m.date(),
			value: new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' }).formatRange(
				new Date(conference.startConference),
				new Date(conference.endConference)
			)
		},
		{ label: m.location(), value: conference.location ?? m.unknownLocation() },
		{ label: m.conferenceLanguage(), value: conference.language ?? m.unknownLanguage() }
	]);

	let deadlineFacts: Fact[] = $derived(
		showDeadline
			? [
					{
						label: m.registrationUntil(),
						value: new Date(conference.startAssignment).toLocaleString(getLocale(), {
							dateStyle: 'long',
							timeStyle: 'short'
						})
					}
				]
			: []
	);

	let websiteFacts: Fact[] = $derived(
		conference.website
			? [
					{
						label: m.conferenceWebsite(),
						value: conference.website.replace(/^https?:\/\//, ''),
						href: conference.website
					}
				]
			: []
	);

	let facts = $derived([...baseFacts, ...deadlineFacts, ...websiteFacts]);
</script>

<dl class="border-base-300 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6">
	{#each facts as fact (fact.label)}
		<div class="flex min-w-0 flex-col gap-1">
			<dt class="text-base-content/70 text-xs font-semibold tracking-widest uppercase">
				{fact.label}
			</dt>
			<dd class="truncate text-lg">
				{#if fact.href}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- the conference website is an external URL, which resolve() cannot take -->
					<a href={fact.href} target="_blank" class="link link-hover">{fact.value}</a>
				{:else}
					{fact.value}
				{/if}
			</dd>
		</div>
	{/each}
</dl>
