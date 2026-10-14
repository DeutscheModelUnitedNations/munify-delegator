<script lang="ts">
	import {
		genderIcon,
		type delegationApplication,
		type SightingReview
	} from '$lib/assignment/sighting';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';
	import formatNames from '$lib/helpers/formatNames';
	import { careNotesOf } from '$lib/helpers/linkedNotes';
	import { m } from '$lib/paraglide/messages';
	import ApplicationDetails from './ApplicationDetails.svelte';
	import NoteInput from './NoteInput.svelte';
	import ReviewControls from './ReviewControls.svelte';

	/** One application in the sighting: who applied, with what, and the team's rating of it. */
	interface Props {
		kind: 'delegation' | 'single';
		id: string;
		codename: string;
		application: ReturnType<typeof delegationApplication>;
		startConference: Date | string;
		review: SightingReview | undefined;
		/** Changes the review; shown at once */
		onReview: (change: Partial<SightingReview>) => void;
	}

	let { kind, id, codename, application, startConference, review, onReview }: Props = $props();

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
							{#if careNotesOf(person)}
								<i
									class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error text-lg"
									title={careNotesOf(person)}
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
			</div>
		</div>

		<ApplicationDetails {application} {startConference} {kind} />

		<NoteInput {review} {onReview} />
	</div>
</div>
