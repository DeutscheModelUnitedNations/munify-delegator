<script lang="ts">
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import { m } from '$lib/paraglide/messages';
	import type { fetchOpenConferences } from '../../../routes/(authenticated)/registration/openConferences';
	import { getConferenceRegistrationStatus } from '$lib/helpers/conferenceRegistrationStatus';
	import type { RegistrationStatus } from '$lib/utils/registrationStatus';
	import type { WaitingListStatus } from '$lib/helpers/waitingListStatus';
	import ConferenceCardFacts from './ConferenceCardFacts.svelte';
	import ConferenceCardActions from './ConferenceCardActions.svelte';

	type Conference = Awaited<ReturnType<typeof fetchOpenConferences>>['conferences'][number];

	let { conference }: { conference: Conference } = $props();

	let status = $derived(getConferenceRegistrationStatus(conference));
	let registrationStatus = $derived(status.registrationStatus);
	let waitingListStatus = $derived(status.waitingListStatus);

	interface StatusBadge {
		text: () => string;
		badge: string;
	}

	const registrationBadges: Record<Exclude<RegistrationStatus, 'WAITING_LIST'>, StatusBadge> = {
		OPEN: { text: m.registrationOpenBadge, badge: 'badge-success' },
		CLOSED: { text: m.registrationClosed, badge: 'badge-ghost' },
		NOT_YET_OPEN: { text: m.registrationNotYetOpen, badge: 'badge-ghost' },
		UNKNOWN: { text: m.unknownRegistrationStatus, badge: 'badge-ghost' }
	};

	const waitingListBadges: Record<WaitingListStatus, StatusBadge> = {
		VACANCIES: { text: m.vacancies, badge: 'badge-warning' },
		SHORT_LIST: { text: m.shortWaitingList, badge: 'badge-warning' },
		LONG_LIST: { text: m.longWaitingList, badge: 'badge-neutral' }
	};

	let badge = $derived(
		registrationStatus === 'WAITING_LIST'
			? waitingListBadges[waitingListStatus]
			: registrationBadges[registrationStatus]
	);
</script>

<article class="bg-base-100 border-base-300 flex flex-col border @3xl:flex-row">
	<img
		src={conference.imageUrl ? conference.imageUrl : defaultImage}
		alt=""
		class="aspect-3/2 w-full object-cover @3xl:aspect-auto @3xl:w-5/12 @3xl:shrink-0"
	/>
	<div class="flex min-w-0 grow flex-col gap-7 p-6 sm:p-10">
		<div class="flex flex-col gap-3">
			<span class="badge {badge.badge} gap-2 font-semibold">
				<span class="size-1.5 rounded-full bg-current"></span>
				{badge.text()}
			</span>
			<h2 class="text-4xl leading-tight font-semibold tracking-tight">{conference.title}</h2>
			{#if conference.longTitle}
				<p class="text-base-content/70 text-lg">{conference.longTitle}</p>
			{/if}
		</div>

		<ConferenceCardFacts {conference} showDeadline={registrationStatus === 'OPEN'} />
		<ConferenceCardActions conferenceId={conference.id} {registrationStatus} {waitingListStatus} />
	</div>
</article>
