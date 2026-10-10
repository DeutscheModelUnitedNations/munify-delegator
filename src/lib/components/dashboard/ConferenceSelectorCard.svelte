<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';
	import { client } from '$lib/api/rumbleClient/client';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { getRegistrationStatus } from '$lib/utils/registrationStatus';
	import { getOptionalCurrentUser } from '$lib/state/currentUser.svelte';
	import {
		conferenceStateIcon,
		conferenceStateLabel
	} from '../../../routes/(authenticated)/dashboard/conferenceGroups';
	import { participationOf, roleText } from './myConferenceCardParticipation';

	interface Props {
		conferenceId: string;
		/** Past conferences recede, so the ones still to come stand out. */
		muted?: boolean;
	}

	let { conferenceId, muted = false }: Props = $props();

	const currentUser = await getOptionalCurrentUser();

	const [conference, myParticipation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				title: true,
				longTitle: true,
				location: true,
				imageUrl: true,
				state: true,
				startConference: true,
				endConference: true,
				startAssignment: true
			}),
			fetchMyParticipation(conferenceId)
		])
	);

	const participation = $derived(participationOf(myParticipation, undefined, conference.state));

	/** What the caller is here, if anything. A supervisor's students are not worth a query on a card. */
	const roleLabel = $derived(
		myParticipation?.supervisor && participation.type === 'unknown'
			? m.supervisor()
			: roleText(participation)
	);
	const takesPart = $derived(!!roleLabel);

	// Someone without a part in a conference can only do one thing there: apply, while that is possible.
	const canApply = $derived(
		!takesPart &&
			!currentUser?.isAdmin &&
			['OPEN', 'WAITING_LIST'].includes(
				getRegistrationStatus(conference.state, new Date(conference.startAssignment))
			)
	);

	const href = $derived(resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId }));

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	};
	const dateRange = $derived(
		`${conference.startConference.toLocaleDateString(getLocale(), dateOptions)} – ${conference.endConference.toLocaleDateString(getLocale(), dateOptions)}`
	);
</script>

<a
	{href}
	class="group card bg-base-100 border-base-200 image-full relative h-60 overflow-hidden border shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl {muted
		? 'opacity-70 hover:opacity-100'
		: ''}"
>
	<figure>
		<img
			src={conference.imageUrl || defaultImage}
			alt=""
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 {muted
				? 'grayscale'
				: ''}"
		/>
	</figure>
	<div class="card-body justify-between p-5">
		<div class="flex items-start justify-between gap-2">
			{#if takesPart}
				<div class="badge badge-neutral badge-sm gap-1.5 font-medium">
					<i class="fa-sharp-duotone fa-solid fa-id-badge text-xs"></i>
					{roleLabel}
				</div>
			{:else}
				<div></div>
			{/if}
			<div class="badge badge-primary badge-sm shrink-0 gap-1.5 font-medium">
				<i class="{conferenceStateIcon(conference.state)} text-xs"></i>
				{conferenceStateLabel(conference.state)}
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<div>
				<h3 class="card-title text-xl leading-tight text-white">{conference.title}</h3>
				{#if conference.longTitle}
					<p class="line-clamp-1 text-sm text-white/80">{conference.longTitle}</p>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
				<span class="flex items-center gap-1.5">
					<i class="fa-sharp-duotone fa-solid fa-calendar text-xs"></i>
					{dateRange}
				</span>
				{#if conference.location}
					<span class="flex items-center gap-1.5">
						<i class="fa-sharp-duotone fa-solid fa-map-marker-alt text-xs"></i>
						{conference.location}
					</span>
				{/if}
			</div>
			<span class="flex items-center gap-2 text-sm font-medium text-white">
				{canApply ? m.signup() : m.goToDashboard()}
				<i
					class="fa-sharp-duotone fa-solid fa-arrow-right transition-transform group-hover:translate-x-1"
				></i>
			</span>
		</div>
	</div>
</a>
