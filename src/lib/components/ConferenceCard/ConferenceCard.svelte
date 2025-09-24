<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import { m } from '$lib/paraglide/messages';
	import type { Conference } from '@prisma/client';

	interface ConferenceCardProps {
		conference: Pick<
			Conference,
			| 'id'
			| 'imageDataURL'
			| 'language'
			| 'title'
			| 'location'
			| 'website'
			| 'endConference'
			| 'longTitle'
			| 'startAssignment'
			| 'startConference'
			| 'state'
		>;

		baseSlug: string;
		btnText?: string;
		alreadyRegistered?: boolean;
		alwaysEnableButton?: boolean;
	}

	let {
		conference,
		baseSlug,
		btnText,
		alreadyRegistered,
		alwaysEnableButton = false
	}: ConferenceCardProps = $props();

	let registrationStatus: 'OPEN' | 'CLOSED' | 'NOT_YET_OPEN' | 'UNKNOWN' = $derived.by(() => {
		if (conference.state === 'PRE') {
			return 'NOT_YET_OPEN';
		}

		if (new Date().getTime() > new Date(conference.startAssignment).getTime()) {
			return 'CLOSED';
		}

		if (
			conference.state === 'PARTICIPANT_REGISTRATION' &&
			new Date().getTime() <= new Date(conference.startAssignment).getTime()
		) {
			return 'OPEN';
		}

		return 'UNKNOWN';
	});

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const cardInfoItems = () => {
		const items: { fontAwesomeIcon: string; text?: string; link?: string }[] = [
			{
				fontAwesomeIcon: 'fa-calendar',
				text: `<span class="whitespace-nowrap">
								${new Date(conference.startConference).toLocaleDateString(getLocale(), dateOptions)}
							</span> - <span class="whitespace-nowrap">
							${new Date(conference.endConference).toLocaleDateString(getLocale(), dateOptions)}
							</span>`
			},
			{ fontAwesomeIcon: 'fa-map-marker-alt', text: conference.location ?? m.unknownLocation() },
			{ fontAwesomeIcon: 'fa-comments', text: conference.language ?? m.unknownLanguage() },
			{
				fontAwesomeIcon: 'fa-calendar-plus',
				text:
					registrationStatus === 'OPEN'
						? m.registrationOpen({
								date: `${new Date(conference.startAssignment as unknown as string)?.toLocaleDateString(getLocale(), dateOptions) ?? ''}`
							})
						: registrationStatus === 'CLOSED'
							? m.registrationClosed()
							: registrationStatus === 'NOT_YET_OPEN'
								? m.registrationNotYetOpen()
								: m.unknownRegistrationStatus()
			}
		];

		if (conference.website) {
			items.push({
				fontAwesomeIcon: 'fa-globe',
				text: conference.website,
				link: conference.website
			});
		}

		return items;
	};
</script>

<div
	class="card carousel-item bg-base-100 border-base-200 w-[90%] max-w-96 border shadow-xl transition-all duration-300 hover:scale-[1.01]"
>
	<figure class="relative aspect-video">
		<img
			src={conference.imageDataURL ? conference.imageDataURL : defaultImage}
			alt="Conference"
			class={alreadyRegistered ? 'scale-110 blur-sm brightness-150 contrast-50 saturate-0' : ''}
		/>
		{#if alreadyRegistered}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="badge badge-outline badge-lg">{m.alreadRegistered()}</div>
			</div>
		{/if}
	</figure>
	<div class="card-body">
		<h2 class="card-title mb-2">{conference.title}</h2>
		<CardInfoSectionWithIcons items={cardInfoItems()} />
		<div class="card-actions mt-4 h-full items-end justify-end">
			{#if (registrationStatus === 'OPEN' && !alreadyRegistered) || alwaysEnableButton}
				<a href={`${baseSlug}/${conference.id}`} class="btn btn-primary">
					{btnText ?? m.signup()}
					<i class="fas fa-arrow-right"></i>
				</a>
			{:else if registrationStatus === 'NOT_YET_OPEN'}
				<button class="btn btn-disabled">
					<i class="fas fa-lock"></i>
					{btnText ?? m.signup()}
				</button>
			{:else}
				<a href={`/dashboard/${conference.id}`} class="btn btn-success">
					{btnText ?? m.dashboard()}
					<i class="fas fa-arrow-right"></i>
				</a>
			{/if}
			<a href="/seats/{conference.id}" target="_blank" class="btn btn-outline btn-primary">
				{m.conferenceSeats()}
				<i class="fas fa-arrow-up-right-from-square"></i>
			</a>
		</div>
	</div>
</div>
