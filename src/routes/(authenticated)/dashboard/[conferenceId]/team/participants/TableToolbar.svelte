<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { GridState } from '#lib/components/dataGrid/gridState.svelte';
	import { OPEN_ISSUES, WAITING_LIST, isQuickFilterOn, toggleQuickFilter } from './quickFilters';
	import type { ParticipantRow } from './types';

	/** The participants' own buttons in the toolbar: the waiting list and open issues. */
	interface Props {
		grid: GridState<ParticipantRow>;
	}

	let { grid }: Props = $props();

	const issuesOn = $derived(isQuickFilterOn({ filter: grid.state.filter, quick: OPEN_ISSUES }));
	const waitingOn = $derived(isQuickFilterOn({ filter: grid.state.filter, quick: WAITING_LIST }));

	function toggleIssues() {
		grid.setFilter(
			toggleQuickFilter({ filter: grid.state.filter, quick: OPEN_ISSUES, on: !issuesOn })
		);
	}

	/** Everyone still waiting, in the order they signed up. */
	function toggleWaiting() {
		grid.setFilter(
			toggleQuickFilter({ filter: grid.state.filter, quick: WAITING_LIST, on: !waitingOn })
		);
		if (waitingOn) return;
		grid.setVisible({ id: 'waitingListSince', visible: true });
		grid.setSorting([{ id: 'waitingListSince', desc: false }]);
	}
</script>

<button
	class="btn btn-sm no-print {waitingOn ? 'btn-primary' : 'btn-ghost'}"
	aria-pressed={waitingOn}
	title={m.onWaitingListDescription()}
	onclick={toggleWaiting}
>
	<i class="fa-sharp-duotone fa-solid fa-user-clock"></i>
	{m.waitingList()}
</button>
<button
	class="btn btn-sm no-print {issuesOn ? 'btn-warning' : 'btn-ghost'}"
	aria-pressed={issuesOn}
	title={m.openIssuesDescription()}
	onclick={toggleIssues}
>
	<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
	{m.openIssues()}
</button>
