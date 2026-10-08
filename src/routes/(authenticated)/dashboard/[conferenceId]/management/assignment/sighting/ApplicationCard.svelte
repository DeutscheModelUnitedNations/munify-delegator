<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		genderIcon,
		type delegationApplication,
		type SightingReview
	} from '$lib/assignment/sighting';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';
	import ApplicationDetails from './ApplicationDetails.svelte';
	import NoteInput from './NoteInput.svelte';
	import ReviewControls from './ReviewControls.svelte';

	/** One application in the sighting: who applied, with what, and the team's rating of it. */
	interface Props {
		conferenceId: string;
		kind: 'delegation' | 'single';
		id: string;
		codename: string;
		application: ReturnType<typeof delegationApplication>;
		startConference: Date | string;
		review: SightingReview | undefined;
		/** Changes the review; shown at once */
		onReview: (change: Partial<SightingReview>) => void;
	}

	let { conferenceId, kind, id, codename, application, startConference, review, onReview }: Props =
		$props();

	const detailsHref = $derived(
		kind === 'delegation'
			? resolve(`/(authenticated)/dashboard/[conferenceId]/management/delegations?selected=${id}`, {
					conferenceId
				})
			: resolve(`/(authenticated)/dashboard/[conferenceId]/management/individuals?selected=${id}`, {
					conferenceId
				})
	);
	/** A single participant is one person: their name and facts head the card instead of a table. */
	const person = $derived(kind === 'single' ? application.people[0] : undefined);
	const age = $derived(
		person?.birthday ? getAgeAtConference(person.birthday, startConference) : undefined
	);
	const border = $derived(
		review?.disqualified
			? 'border-error border-2'
			: review?.flagged
				? 'border-warning border-2'
				: ''
	);
</script>

<div class="card bg-base-100 border-base-200 h-full border shadow-sm transition-colors {border}">
	<div class="card-body gap-6 overflow-y-auto">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col">
				<h3 class="flex items-center gap-2 text-xl font-bold">
					<i class="fa-sharp-duotone fa-solid {kind === 'delegation' ? 'fa-users' : 'fa-user'}"></i>
					{#if person}
						<button
							type="button"
							class="link link-hover cursor-pointer"
							onclick={() => openUserCard(person.id)}
						>
							{formatNames(person.givenName, person.familyName)}
						</button>
						<span class="flex items-center gap-3 text-base font-normal tabular-nums">
							<span title={m.assignmentAge()}>{age ?? '?'}</span>
							<i class="fa-sharp-duotone fa-solid fa-{genderIcon(person.gender)}"></i>
							{#if person.conferenceParticipationsCount > 0}
								<span class="text-warning" title={m.assignmentPreviousParticipations()}>
									<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
									{person.conferenceParticipationsCount}
								</span>
							{/if}
							{#if person.globalNotes?.trim()}
								<i
									class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error text-lg"
									title={person.globalNotes.trim()}
									aria-label={m.globalNotes()}
								></i>
							{/if}
						</span>
					{:else}
						{codename}
					{/if}
				</h3>
				<span class="text-base-content/50 font-mono text-xs">{id}</span>
			</div>
			<div class="flex items-center gap-2">
				<ReviewControls {review} {onReview} />
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above, with the selection as query -->
				<a
					class="btn btn-square btn-ghost"
					href={detailsHref}
					target="_blank"
					aria-label={m.assignmentOpenDetails()}
					title={m.assignmentOpenDetails()}
				>
					<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
				</a>
			</div>
		</div>

		<ApplicationDetails {conferenceId} {application} {startConference} {kind} />

		<NoteInput {review} {onReview} />
	</div>
</div>
