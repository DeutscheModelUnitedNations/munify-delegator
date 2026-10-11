<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Table } from '$lib/components/tanStackTable';
	import type { ManagedTableFeatures } from '$lib/components/tanStackTable/managedTable';
	import type { ParticipantRow } from './types';

	/** The participants' own button in the table's toolbar row: the open issues. */
	interface Props {
		table: Table<ManagedTableFeatures, ParticipantRow>;
	}

	let { table }: Props = $props();

	const issueFilterActive = $derived(table.getColumn('hasOpenIssue')?.getFilterValue() === true);

	/** Shows accepted participants with an open issue; clicking again drops both filters. */
	function toggleIssueFilter() {
		if (issueFilterActive) {
			table.getColumn('hasOpenIssue')?.setFilterValue(undefined);
			return;
		}
		table.getColumn('accepted')?.setFilterValue(true);
		table.getColumn('hasOpenIssue')?.setFilterValue(true);
	}
</script>

<button
	class="btn btn-sm no-print {issueFilterActive ? 'btn-warning' : 'btn-ghost'}"
	aria-pressed={issueFilterActive}
	title={m.openIssuesDescription()}
	onclick={toggleIssueFilter}
>
	<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
	{m.openIssues()}
</button>
