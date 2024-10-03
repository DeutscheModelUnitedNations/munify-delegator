<script lang="ts">
	import CardInfoSectionWithIcons from './CardInfoSectionWithIcons.svelte';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { onMount } from 'svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import * as m from '$lib/paraglide/messages.js';

	interface ConferenceCardProps {
		id: string;
		location?: string | null;
		language?: string | null;
		start?: Date | null;
		end?: Date | null;
		startRegistration?: Date | null;
		endRegistration?: Date | null;
		website?: string | null;
		imageDataUrl?: string | null;
		title: string;
		baseSlug: string;
		btnText?: string;
		alreadyRegistered?: boolean;
	}

	let {
		id,
		imageDataUrl,
		language,
		title,
		location,
		start,
		end,
		website,
		baseSlug,
		btnText,
		startRegistration,
		endRegistration,
		alreadyRegistered
	}: ConferenceCardProps = $props();

	enum RegistrationStatus {
		NOT_YET_OPEN,
		OPEN,
		CLOSED,
		UNKNOWN
	}

	let registrationStatus = () => {
		if (!startRegistration || !endRegistration) {
			return RegistrationStatus.UNKNOWN;
		}

		if (new Date().getTime() < new Date(startRegistration).getTime()) {
			return RegistrationStatus.NOT_YET_OPEN;
		}

		if (new Date().getTime() > new Date(endRegistration).getTime()) {
			return RegistrationStatus.CLOSED;
		}

		if (
			new Date().getTime() >= new Date(startRegistration).getTime() &&
			new Date().getTime() <= new Date(endRegistration).getTime()
		) {
			return RegistrationStatus.OPEN;
		}

		return RegistrationStatus.UNKNOWN;
	};

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const cardInfoItems = () => {
		const items: { fontAwesomeIcon: string; text?: string; link?: string }[] = [
			{
				fontAwesomeIcon: 'fa-calendar',
				text:
					start && end
						? `${new Date(start).toLocaleDateString(languageTag(), dateOptions)} - ${new Date(end).toLocaleDateString(languageTag(), dateOptions)}`
						: m.unknownDate()
			},
			{ fontAwesomeIcon: 'fa-map-marker-alt', text: location ?? m.unknownLocation() },
			{ fontAwesomeIcon: 'fa-comments', text: language ?? m.unknownLanguage() },
			{
				fontAwesomeIcon: 'fa-calendar-plus',
				text:
					registrationStatus() === RegistrationStatus.OPEN
						? m.registrationOpen({
								date: `${new Date(endRegistration as unknown as string)?.toLocaleDateString(languageTag(), dateOptions) ?? ''}`
							})
						: registrationStatus() === RegistrationStatus.CLOSED
							? m.registrationClosed()
							: registrationStatus() === RegistrationStatus.NOT_YET_OPEN
								? m.registrationNotYetOpen({
										date: `${new Date(startRegistration as unknown as string)?.toLocaleDateString(languageTag(), dateOptions) ?? ''}`
									})
								: m.unknownRegistrationStatus()
			}
		];

		if (website) {
			items.push({ fontAwesomeIcon: 'fa-globe', text: website, link: website });
		}

		return items;
	};
</script>

<div
	class="carousel-item card bg-base-100 dark:bg-base-200 max-w-96 w-[90%] shadow-xl hover:scale-[1.01] transition-all duration-300"
>
	<figure class="relative">
		<img
			src={imageDataUrl ? imageDataUrl : defaultImage}
			alt="Conference"
			class={alreadyRegistered ? 'saturate-0 brightness-150 contrast-50 blur-sm scale-110' : ''}
		/>
		{#if alreadyRegistered}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="badge badge-outline badge-lg">{m.alreadRegistered()}</div>
			</div>
		{/if}
	</figure>
	<div class="card-body">
		<h2 class="card-title mb-2">{title}</h2>
		<CardInfoSectionWithIcons items={cardInfoItems()} />
		<div class="card-actions justify-end mt-4">
			{#if registrationStatus() === RegistrationStatus.OPEN && !alreadyRegistered}
				<a href={`${baseSlug}/${id}`} class="btn btn-primary">
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
