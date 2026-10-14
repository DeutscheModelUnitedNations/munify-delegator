<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import {
		HANDOFF_WINDOW_MS,
		HISTORY_SHOWN,
		historyOrigin,
		setAvailableHandoff,
		setSearchHistory,
		type SearchHistoryEntry
	} from './searchHistory.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	/** Keeps the caller's latest searches, from every device, in sync for the palette and header. */
	const live = $derived(
		await client.liveQuery.searchHistories({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { createdAt: 'desc' },
				limit: HISTORY_SHOWN
			},
			id: true,
			createdAt: true,
			originId: true,
			label: true,
			resultId: true
		})
	);

	// Plain copies, so nothing below subscribes to the live result once more per field.
	const entries = $derived(
		live.map((row) => ({
			id: row.id,
			createdAt: new Date(row.createdAt).getTime(),
			originId: row.originId,
			label: row.label,
			resultId: row.resultId
		}))
	);

	let now = $state(Date.now());

	// Only the newest entry can be a hint, and only one that another device made.
	const offered = $derived.by(() => {
		const latest = entries.at(0);
		if (!latest || latest.originId === historyOrigin()) return undefined;
		return now - latest.createdAt < HANDOFF_WINDOW_MS ? latest : undefined;
	});

	// A new entry is judged against the clock right away, and again when its window ends.
	$effect(() => {
		const latest = entries.at(0);
		if (!latest) return;
		const arrival = latest.createdAt;
		now = Date.now();
		const timer = setTimeout(
			() => (now = Date.now()),
			Math.max(0, arrival + HANDOFF_WINDOW_MS - Date.now()) + 50
		);
		return () => clearTimeout(timer);
	});

	function entryOf({ id, label, resultId }: SearchHistoryEntry): SearchHistoryEntry {
		return { id, label, resultId };
	}

	$effect(() => {
		setSearchHistory(entries.map(entryOf));
		setAvailableHandoff(offered ? entryOf(offered) : null);
		return () => {
			setSearchHistory([]);
			setAvailableHandoff(null);
		};
	});
</script>
