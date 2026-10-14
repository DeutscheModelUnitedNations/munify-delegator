import { queryParameters } from 'sveltekit-search-params';

export interface PaperGroupsSnapshot<Grouped, Introduction> {
	readonly grouped: Grouped | undefined;
	readonly introduction: Introduction | undefined;
	readonly loading: boolean;
	readonly error: string | undefined;
}

/**
 * The papers of a paper hub view, grouped by committee and agenda item, plus the introduction
 * papers that have no agenda item. Loaded once per conference rather than live: a conference's
 * papers are a large tree, and the views only need a snapshot. Must be called during component
 * initialisation; `load` is re-run whenever what it reads (the conference id) changes.
 */
export function createPaperGroupsSnapshot<Grouped, Introduction>(
	load: () => Promise<[Grouped, Introduction]>
): PaperGroupsSnapshot<Grouped, Introduction> {
	let grouped = $state<Grouped>();
	let introduction = $state<Introduction>();
	let loading = $state(false);
	let error = $state<string>();

	$effect(() => {
		loading = true;
		error = undefined;
		void load()
			.then(([loadedGrouped, loadedIntroduction]) => {
				grouped = loadedGrouped;
				introduction = loadedIntroduction;
			})
			.catch((e: unknown) => {
				error = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				loading = false;
			});
	});

	return {
		get grouped() {
			return grouped;
		},
		get introduction() {
			return introduction;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		}
	};
}

export type ExpandedPaperGroup = ReturnType<typeof createExpandedPaperGroup>;

/**
 * Which committee, and which of its agenda items, is expanded, kept in the URL so a reload or a
 * shared link opens the same group. At most one of each is open at a time. Must be called during
 * component initialisation.
 */
export function createExpandedPaperGroup() {
	const params = queryParameters({ committee: true, topic: true });

	return {
		get committee() {
			return params.committee;
		},

		get topic() {
			return params.topic;
		},

		toggleCommittee(committeeId: string) {
			params.committee = params.committee === committeeId ? null : committeeId;
			params.topic = null;
		},

		toggleAgendaItem(agendaItemId: string) {
			params.topic = params.topic === agendaItemId ? null : agendaItemId;
		}
	};
}
