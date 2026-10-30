<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Table } from '#lib/components/tanStackTable/index';
	import type { ManagedTableFeatures } from '#lib/components/tanStackTable/managedTable';
	import type { ParticipantRow } from './types';

	/** The participants' own buttons in the table's toolbar row: open issues and the waiting list. */
	interface Props {
		table: Table<ManagedTableFeatures, ParticipantRow>;
	}

	let { table }: Props = $props();

	const issueFilterActive = $derived(table.getColumn('hasOpenIssue')?.getFilterValue() === true);
	const waitingListActive = $derived(table.getColumn('onWaitingList')?.getFilterValue() === true);

	/** Shows accepted participants with an open issue; clicking again drops both filters. */
	function toggleIssueFilter() {
		if (issueFilterActive) {
			table.getColumn('hasOpenIssue')?.setFilterValue(undefined);
			return;
		}
		table.getColumn('onWaitingList')?.setFilterValue(undefined);
		table.getColumn('accepted')?.setFilterValue(true);
		table.getColumn('hasOpenIssue')?.setFilterValue(true);
	}

	/**
	 * Shows everyone still waiting for a seat - people without a registration and applicants
	 * without a role alike - in the order they signed up. The "accepted" filter would hide them,
	 * so it goes; clicking again drops the waiting list filter.
	 */
	function toggleWaitingList() {
		if (waitingListActive) {
			table.getColumn('onWaitingList')?.setFilterValue(undefined);
			return;
		}
		table.getColumn('accepted')?.setFilterValue(undefined);
		table.getColumn('hasOpenIssue')?.setFilterValue(undefined);
		table.getColumn('onWaitingList')?.setFilterValue(true);
		table.getColumn('waitingListSince')?.toggleVisibility(true);
		table.setSorting([{ id: 'waitingListSince', desc: false }]);
	}
</script>

<button
	class="btn btn-sm no-print {waitingListActive ? 'btn-primary' : 'btn-ghost'}"
	aria-pressed={waitingListActive}
	title={m.onWaitingListDescription()}
	onclick={toggleWaitingList}
>
	<i class="fa-sharp-duotone fa-solid fa-user-clock"></i>
	{m.waitingList()}
</button>
<button
	class="btn btn-sm no-print {issueFilterActive ? 'btn-warning' : 'btn-ghost'}"
	aria-pressed={issueFilterActive}
	title={m.openIssuesDescription()}
	onclick={toggleIssueFilter}
>
	<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
	{m.openIssues()}
</button>
