<script lang="ts">
	import { resolve } from '$app/paths';
	import type { delegationApplication, SightingReview } from '$lib/assignment/sighting';
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
	}

	let { conferenceId, kind, id, codename, application, startConference, review }: Props = $props();

	const detailsHref = $derived(
		kind === 'delegation'
			? resolve(`/(authenticated)/dashboard/[conferenceId]/management/delegations?selected=${id}`, {
					conferenceId
				})
			: resolve(`/(authenticated)/dashboard/[conferenceId]/management/individuals?selected=${id}`, {
					conferenceId
				})
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
					<i class="fa-duotone {kind === 'delegation' ? 'fa-users' : 'fa-user'}"></i>
					{codename}
				</h3>
				<span class="text-base-content/50 font-mono text-xs">{id}</span>
			</div>
			<div class="flex items-center gap-2">
				<ReviewControls {kind} {id} {review} />
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above, with the selection as query -->
				<a
					class="btn btn-square btn-ghost"
					href={detailsHref}
					target="_blank"
					aria-label={m.assignmentOpenDetails()}
					title={m.assignmentOpenDetails()}
				>
					<i class="fa-duotone fa-arrow-up-right-from-square"></i>
				</a>
			</div>
		</div>

		<ApplicationDetails {conferenceId} {application} {startConference} />

		<NoteInput {kind} {id} {review} />
	</div>
</div>
