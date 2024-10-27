<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import * as m from '$lib/paraglide/messages.js';
	import type { Conference } from '@prisma/client';

	interface ConferenceCardProps {
		conference: Pick<
			Conference,
			| 'id'
			| 'imageDataUrl'
			| 'language'
			| 'title'
			| 'location'
			| 'website'
			| 'endConference'
			| 'longTitle'
			| 'startAssignment'
			| 'startConference'
			| 'startRegistration'
		>;

		baseSlug: string;
		btnText?: string;
		alreadyRegistered?: boolean;
	}

	let { conference, baseSlug, btnText, alreadyRegistered }: ConferenceCardProps = $props();

	let registrationStatus: 'OPEN' | 'CLOSED' | 'NOT_YET_OPEN' | 'UNKNOWN' = $derived.by(() => {
		if (new Date().getTime() < new Date(conference.startRegistration).getTime()) {
			return 'NOT_YET_OPEN';
		}

		if (new Date().getTime() > new Date(conference.startAssignment).getTime()) {
			return 'CLOSED';
		}

		if (
			new Date().getTime() >= new Date(conference.startRegistration).getTime() &&
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
								${new Date(conference.startConference).toLocaleDateString(languageTag(), dateOptions)}
							</span> - <span class="whitespace-nowrap">
							${new Date(conference.endConference).toLocaleDateString(languageTag(), dateOptions)}
							</span>`
			},
			{ fontAwesomeIcon: 'fa-map-marker-alt', text: conference.location ?? m.unknownLocation() },
			{ fontAwesomeIcon: 'fa-comments', text: conference.language ?? m.unknownLanguage() },
			{
				fontAwesomeIcon: 'fa-calendar-plus',
				text:
					registrationStatus === 'OPEN'
						? m.registrationOpen({
								date: `${new Date(conference.startAssignment as unknown as string)?.toLocaleDateString(languageTag(), dateOptions) ?? ''}`
							})
						: registrationStatus === 'CLOSED'
							? m.registrationClosed()
							: registrationStatus === 'NOT_YET_OPEN'
								? m.registrationNotYetOpen({
										date: `${new Date(conference.startRegistration as unknown as string)?.toLocaleDateString(languageTag(), dateOptions) ?? ''}`
									})
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
	class="card carousel-item w-[90%] max-w-96 bg-base-100 shadow-xl transition-all duration-300 hover:scale-[1.01] dark:bg-base-200"
>
	<figure class="relative aspect-video">
		<img
			src={conference.imageDataUrl ? conference.imageDataUrl : defaultImage}
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
			{#if registrationStatus === 'OPEN' && !alreadyRegistered}
				<a href={`${baseSlug}/${conference.id}`} class="btn btn-primary">
					{btnText ?? m.signup()}
					<i class="fas fa-arrow-right"></i>
				</a>
			{:else}
				<button class="btn" disabled>
					{m.signup()}
					<i class="fas fa-arrow-right"></i>
				</button>
			{/if}
		</div>
	</div>
</div>
