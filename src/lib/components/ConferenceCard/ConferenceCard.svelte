<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import { m } from '$lib/paraglide/messages';
	import type { ConferenceOpenForRegistrationQuery$result } from '$houdini';
	import { getRegistrationStatus, type RegistrationStatus } from '$lib/services/registrationStatus';
	import { getWaitingListStatus } from '$lib/services/waitingListStatus';

	interface ConferenceCardProps {
		conference: NonNullable<
			ConferenceOpenForRegistrationQuery$result['findManyConferences']
		>[number];
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

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const registrationInfoText = () => {
		switch (registrationStatus) {
			case 'WAITING_LIST':
				switch (waitingListStatus) {
					case 'VACANCIES':
						return m.vacancies();
					case 'SHORT_LIST':
						return m.shortWaitingList();
					case 'LONG_LIST':
						return m.longWaitingList();
				}
				break;
			case 'OPEN':
				return m.registrationOpen({
					date: `${new Date(conference.startAssignment as unknown as string)?.toLocaleDateString(getLocale(), dateOptions) ?? ''}`
				});
			case 'CLOSED':
				return m.registrationClosed();
			case 'NOT_YET_OPEN':
				return m.registrationNotYetOpen();
			case 'UNKNOWN':
				return m.unknownRegistrationStatus();
		}
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
			{ fontAwesomeIcon: 'fa-calendar-plus', text: registrationInfoText() }
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
		<div class="card-actions mt-4 h-full flex-col items-end justify-end">
			{#if alreadyRegistered && !alwaysEnableButton}
				<a href={`/dashboard/${conference.id}`} class="btn btn-success">
					{btnText ?? m.dashboard()}
					<i class="fas fa-arrow-right"></i>
				</a>
			{:else if registrationStatus === 'OPEN' || alwaysEnableButton}
				<a href="${baseSlug}/${conference.id}" class="btn btn-primary">
					{btnText ?? m.signup()}
					<i class="fas fa-arrow-right"></i>
				</a>
			{:else if registrationStatus === 'WAITING_LIST'}
				<a href="{baseSlug}/{conference.id}/waiting-list" class="btn btn-accent">
					{btnText ?? (waitingListStatus === 'VACANCIES' ? m.vacanciesBtn() : m.waitingListBtn())}
					<i class="fas fa-arrow-right"></i>
				</a>
			{:else}
				<button class="btn btn-disabled">
					<i class="fas fa-lock"></i>
					{btnText ?? m.signup()}
				</button>
			{/if}
			<a href="/seats/{conference.id}" target="_blank" class="btn btn-outline btn-primary">
				{m.conferenceSeats()}
				<i class="fas fa-arrow-up-right-from-square"></i>
			</a>
		</div>
	</div>
</div>
