import { queryParameters } from 'sveltekit-search-params';

/**
 * The papers of a paper hub view, grouped by committee and agenda item, plus the introduction
 * papers that have no agenda item. Loaded once per conference rather than live: a conference's
 * papers are a large tree, and the views only need a snapshot. Must be created during component
 * initialisation; `load` is re-run whenever what it reads (the conference id) changes.
 */
export class PaperGroupsSnapshot<Grouped, Introduction> {
	grouped = $state<Grouped>();
	introduction = $state<Introduction>();
	loading = $state(false);
	error = $state<string>();

	constructor(load: () => Promise<[Grouped, Introduction]>) {
		$effect(() => {
			this.loading = true;
			this.error = undefined;
			void load()
				.then(([grouped, introduction]) => {
					this.grouped = grouped;
					this.introduction = introduction;
				})
				.catch((error: unknown) => {
					this.error = error instanceof Error ? error.message : String(error);
				})
				.finally(() => {
					this.loading = false;
				});
		});
	}
}

/**
 * Which committee, and which of its agenda items, is expanded, kept in the URL so a reload or a
 * shared link opens the same group. At most one of each is open at a time. Must be created during
 * component initialisation.
 */
export class ExpandedPaperGroup {
	#params = queryParameters({ committee: true, topic: true });

	get committee() {
		return this.#params.committee;
	}

	get topic() {
		return this.#params.topic;
	}

	toggleCommittee(committeeId: string) {
		this.#params.committee = this.#params.committee === committeeId ? null : committeeId;
		this.#params.topic = null;
	}

	toggleAgendaItem(agendaItemId: string) {
		this.#params.topic = this.#params.topic === agendaItemId ? null : agendaItemId;
	}
}
