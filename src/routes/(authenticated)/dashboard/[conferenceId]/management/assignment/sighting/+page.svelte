<script lang="ts">
	import codenamize from '$lib/helpers/codenamize';
	import {
		SIGHTING_STATUSES,
		delegationApplication,
		searchFieldsOf,
		searchSightings,
		singleApplication,
		deckPosition,
		applicationOf,
		filterSightings,
		schoolsOf,
		type SightingEntry,
		type SightingStatus
	} from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { queryParameters, ssp } from 'sveltekit-search-params';
	import { reviewLookup } from '$lib/assignment/board';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { fetchAssignmentReviews } from '../board';
	import { fetchSightingApplications } from './applications';
	import ApplicationCard from './ApplicationCard.svelte';
	import FilterSelects from './FilterSelects.svelte';
	import DeckNav from './DeckNav.svelte';
	import SearchResults from './SearchResults.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// Applications and reviews are separate live queries: rating something only reloads the reviews.
	const [applications, reviews] = $derived(
		await Promise.all([
			fetchSightingApplications(routeParams.conferenceId),
			fetchAssignmentReviews(routeParams.conferenceId)
		])
	);

	const params = queryParameters({
		search: ssp.string(''),
		status: ssp.string('all'),
		school: true,
		application: true
	});

	const entries = $derived.by((): SightingEntry[] => {
		const reviewOf = reviewLookup(reviews);
		return [
			...applications.delegations.map((delegation) => ({
				kind: 'delegation' as const,
				id: delegation.id,
				codename: codenamize(delegation.id),
				school: delegation.school ?? null,
				size: delegation.members.length,
				fields: searchFieldsOf(delegationApplication(delegation, String)),
				review: reviewOf({ delegationId: delegation.id, singleParticipantId: null })
			})),
			...applications.singleParticipants.map((single) => ({
				kind: 'single' as const,
				id: single.id,
				codename: codenamize(single.id),
				school: single.school ?? null,
				size: 1,
				fields: searchFieldsOf(singleApplication(single)),
				review: reviewOf({ delegationId: null, singleParticipantId: single.id })
			}))
		];
	});

	const status = $derived<SightingStatus>(
		SIGHTING_STATUSES.find((s) => s === params.status) ?? 'all'
	);
	const searcher = $derived(searchSightings(entries));
	const shown = $derived(
		filterSightings(
			entries,
			{ search: params.search ?? '', status, school: params.school ?? null },
			searcher
		)
	);
	// The card on top: the one asked for, or the first once it is filtered away.
	const position = $derived(deckPosition(shown, params.application));
	const current = $derived(position.current);
	const application = $derived(
		current && applicationOf(current, applications, getFullTranslatedCountryNameFromISO3Code)
	);

	// Which way the next card slides in from: forward comes from the right, back from the left.
	let direction = $state(1);
	function select(id: string) {
		if (id === current?.id) return;
		const target = shown.findIndex((entry) => entry.id === id);
		direction = target < position.index ? -1 : 1;
		params.application = id;
	}

	const searching = $derived((params.search ?? '').trim() !== '');
	const RESULT_LIMIT = 5;

	/** Leaves the search for the application: back in the deck, with the search cleared. */
	function pick(id: string) {
		const inDeck = filterSightings(entries, { search: '', status, school: params.school ?? null });
		// A status or school filter that hides it would put the deck somewhere else.
		if (!inDeck.some((entry) => entry.id === id)) {
			params.status = 'all';
			params.school = null;
		}
		direction = 1;
		params.search = '';
		params.application = id;
	}

	const rated = $derived(
		entries.filter((entry) => entry.review?.evaluation != null || entry.review?.disqualified).length
	);
	const schools = $derived(schoolsOf(entries));
</script>

<div class="flex flex-col gap-4">
	<div class="alert alert-info alert-soft">
		<i class="fa-duotone fa-eye text-xl"></i>
		<div class="flex flex-col gap-1">
			<p>{m.assignmentSightingHint()}</p>
			<progress class="progress progress-primary w-64" value={rated} max={entries.length}
			></progress>
			<span class="text-xs">
				{m.assignmentSightingProgress({ rated, total: entries.length })}
			</span>
		</div>
	</div>

	<div class="flex flex-wrap items-end gap-2">
		<label class="input">
			<i class="fa-duotone fa-magnifying-glass opacity-60"></i>
			<input
				type="search"
				placeholder={m.search()}
				value={params.search ?? ''}
				oninput={(e) => {
					params.search = e.currentTarget.value;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' && shown[0]) pick(shown[0].id);
				}}
			/>
		</label>
		<FilterSelects
			{status}
			school={params.school ?? null}
			{schools}
			onStatus={(value) => (params.status = value)}
			onSchool={(value) => (params.school = value)}
		/>
		<span class="text-base-content/60 ml-auto text-sm">
			{m.assignmentShownCount({ shown: shown.length, total: entries.length })}
		</span>
	</div>

	{#if searching}
		<SearchResults
			search={params.search ?? ''}
			results={shown.slice(0, RESULT_LIMIT)}
			total={shown.length}
			onSelect={pick}
		/>
	{:else if current && application}
		{#key current.id}
			<div
				class="h-[36rem] max-h-[70vh]"
				in:fly={{ x: direction * 80, duration: prefersReducedMotion.current ? 0 : 160 }}
			>
				<ApplicationCard
					conferenceId={routeParams.conferenceId}
					kind={current.kind}
					id={current.id}
					codename={current.codename}
					review={current.review}
					{application}
					startConference={applications.startConference}
				/>
			</div>
		{/key}
		<DeckNav deck={shown} currentId={current.id} onSelect={select} />
	{:else}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<i class="fa-duotone fa-inbox text-base-content/30 mb-4 text-4xl"></i>
			<p class="text-base-content/60">{m.assignmentNoApplications()}</p>
		</div>
	{/if}
</div>
