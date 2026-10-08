<script lang="ts">
	import codenamize from '$lib/helpers/codenamize';
	import {
		SIGHTING_STATUSES,
		delegationApplication,
		entryKind,
		searchHitEntries,
		singleApplication,
		type SightingReview,
		type SightingStatus
	} from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { queryParameters, ssp } from 'sveltekit-search-params';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { untrack } from 'svelte';
	import {
		fetchApplication,
		fetchReview,
		fetchStartConference,
		loadSightingDeck,
		prefetchCards,
		searchApplications
	} from './applications';
	import { SightingDeckWindow } from './deckWindow.svelte';
	import { saveReview, savedReview } from './savedReviews.svelte';
	import ApplicationCard from './ApplicationCard.svelte';
	import FilterSelects from './FilterSelects.svelte';
	import DeckNav from './DeckNav.svelte';
	import SearchResults from './SearchResults.svelte';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	// A navigation hands the page fresh params; reading them inside an awaited derived would ask
	// again for everything on every card turn, from the state of a batch still under way.
	const conferenceId = $derived(routeParams.conferenceId);

	// No defaults written into the URL: that is a navigation on arrival, which pushes a history
	// entry and traps the back button when the page is entered with `?application=`.
	const params = queryParameters(
		{
			search: ssp.string(''),
			status: ssp.string('all'),
			school: true,
			application: true
		},
		{ showDefaults: false }
	);

	// What the deck is asked for is held here and written to the URL, rather than read back from
	// it: the URL parameters follow a navigation that is still under way, and an awaited deck
	// reading them in the meantime sees the value from before the click and asks for that card
	// again. The URL is only read on arrival and when the browser steps back or forward.
	const asStatus = (value: string | null): SightingStatus =>
		SIGHTING_STATUSES.find((s) => s === value) ?? 'all';
	let view = $state({
		application: params.application ?? null,
		status: asStatus(params.status),
		school: params.school ?? null
	});
	const status = $derived(view.status);
	const school = $derived(view.school);

	function onPopstate() {
		const url = new URL(location.href).searchParams;
		const application = url.get('application');
		view.application = application;
		view.status = asStatus(url.get('status'));
		view.school = url.get('school');
		if (
			application &&
			sighting.filter.status === view.status &&
			sighting.filter.school === view.school
		) {
			void sighting.goTo(application);
		}
	}

	// The deck is the backend's: filtered, ordered and cut down to a window around the card on top,
	// so neither the applications nor their reviews are loaded here. Only a change of filter waits
	// for a new deck; turning the cards, reviewing them and moving the window along do not (see
	// `SightingDeckWindow`). The card asked for is read once, when the deck is set up.
	const [loaded, startConference] = $derived(
		await Promise.all([
			loadSightingDeck(
				conferenceId,
				{ status, school },
				untrack(() => view.application)
			),
			fetchStartConference(conferenceId)
		])
	);
	const sighting = $derived(new SightingDeckWindow(loaded));
	const deck = $derived(sighting.deck);
	const position = $derived(sighting.position);

	// The search runs in the backend over school, texts, members and supervisors, and over the
	// codenames and ids, which only the backend can work out. What comes back is a handful.
	const searching = $derived((params.search ?? '').trim() !== '');
	const SEARCH_DELAY_MS = 250;
	let searchTerm = $state((params.search ?? '').trim());
	$effect(() => {
		const typed = (params.search ?? '').trim();
		const timer = setTimeout(() => (searchTerm = typed), SEARCH_DELAY_MS);
		return () => clearTimeout(timer);
	});
	const hits = $derived(
		searchTerm ? await searchApplications(conferenceId, searchTerm, { status, school }) : undefined
	);
	const searchShown = $derived(searchHitEntries(hits, searchTerm, codenamize));

	// The card on top: the one asked for, or the one taking its place once it is filtered away.
	const current = $derived(position.current);
	const currentKind = $derived(current ? entryKind(current.kind) : undefined);
	const currentId = $derived(current?.id);
	const detail = $derived(
		currentKind && currentId ? await fetchApplication(currentKind, currentId) : undefined
	);
	const fetchedReview = $derived(
		currentKind && currentId ? await fetchReview(currentKind, currentId) : undefined
	);
	// What this browser saved shows at once, ahead of what the backend had when the card was read.
	const review = $derived((currentId && savedReview(currentId)) || fetchedReview);
	const application = $derived(
		detail &&
			(detail.kind === 'single'
				? singleApplication(detail.single)
				: delegationApplication(detail.delegation, getFullTranslatedCountryNameFromISO3Code))
	);

	// The cards around the one on top are what the next key presses open; they are read ahead,
	// reviews included, nearest first.
	const PREFETCH_AHEAD = 5;
	const PREFETCH_BEHIND = 2;
	$effect(() => {
		prefetchCards(sighting.upcoming(PREFETCH_AHEAD, PREFETCH_BEHIND));
	});

	// Which way the next card slides in from: forward comes from the right, back from the left.
	let direction = $state(1);
	function select(id: string) {
		if (id === currentId) return;
		direction = id === position.previous?.id ? -1 : 1;
		view.application = id;
		params.application = id;
		void sighting.goTo(id);
	}

	async function seek(index: number) {
		direction = index < position.index ? -1 : 1;
		const id = await sighting.seek(index);
		if (!id) return;
		view.application = id;
		params.application = id;
	}

	/**
	 * Reviews the card on top: shown at once, card and strip alike, and the deck asked for again
	 * once the backend has it, for the counts and the filters.
	 */
	async function reviewCurrent(change: Partial<SightingReview>) {
		if (!currentKind || !currentId) return;
		const deckWindow = sighting;
		deckWindow.recolour(currentId, { flagged: false, disqualified: false, ...review, ...change });
		await saveReview(currentKind, currentId, review, change);
		deckWindow.refresh();
	}

	const RESULT_LIMIT = 5;

	/** Leaves the search for the application: back in the deck, with the search cleared. */
	function pick(id: string) {
		direction = 1;
		params.search = '';
		view.application = id;
		params.application = id;
		void sighting.goTo(id);
	}
</script>

<svelte:window onpopstate={onPopstate} />

<div class="flex flex-col gap-4">
	<div class="alert alert-info alert-soft">
		<i class="fa-sharp-duotone fa-solid fa-eye text-xl"></i>
		<div class="flex flex-col gap-1">
			<p>{m.assignmentSightingHint()}</p>
			<progress
				class="progress progress-primary w-64"
				value={deck.overallRated}
				max={deck.overallTotal}
			></progress>
			<span class="text-xs">
				{m.assignmentSightingProgress({ rated: deck.overallRated, total: deck.overallTotal })}
			</span>
		</div>
	</div>

	<div class="flex flex-wrap items-end gap-2">
		<label class="input">
			<i class="fa-sharp-duotone fa-solid fa-magnifying-glass opacity-60"></i>
			<input
				type="search"
				placeholder={m.search()}
				value={params.search ?? ''}
				oninput={(e) => {
					params.search = e.currentTarget.value;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' && searching && searchShown[0]) pick(searchShown[0].id);
				}}
			/>
		</label>
		<FilterSelects
			{status}
			{school}
			{conferenceId}
			onStatus={(value) => {
				view.status = asStatus(value);
				params.status = value;
			}}
			onSchool={(value) => {
				view.school = value;
				params.school = value;
			}}
		/>
		<span class="text-base-content/60 ml-auto text-sm">
			{m.assignmentShownCount({
				shown: searching ? searchShown.length : deck.total,
				total: deck.overallTotal
			})}
		</span>
	</div>

	{#if searching}
		<SearchResults
			search={params.search ?? ''}
			results={searchShown.slice(0, RESULT_LIMIT)}
			total={searchShown.length}
			onSelect={pick}
		/>
	{:else if current && currentKind && application}
		{#key current.id}
			<div
				class="h-[46rem] max-h-[75vh]"
				in:fly={{ x: direction * 80, duration: prefersReducedMotion.current ? 0 : 160 }}
			>
				<ApplicationCard
					{conferenceId}
					kind={currentKind}
					id={current.id}
					codename={codenamize(current.id)}
					{review}
					{application}
					{startConference}
					onReview={reviewCurrent}
				/>
			</div>
		{/key}
		<DeckNav {deck} {position} onSelect={select} onSeek={seek} />
	{:else}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<i class="fa-sharp-duotone fa-solid fa-inbox text-base-content/30 mb-4 text-4xl"></i>
			<p class="text-base-content/60">{m.assignmentNoApplications()}</p>
		</div>
	{/if}
</div>
