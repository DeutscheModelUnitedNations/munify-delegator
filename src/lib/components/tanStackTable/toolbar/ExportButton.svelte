<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { downloadCSV, downloadJSON } from '$lib/utils/downloadHelpers';
	import type { TableExport } from '../managedTable';

	interface Props {
		/** Called when an export is chosen, so the text is only built then */
		getExport: () => TableExport;
		/** Base name of the downloaded file */
		filename: string;
	}

	let { getExport, filename }: Props = $props();

	const stamp = () => new Date().toISOString().slice(0, 10);

	function exportCsv() {
		const { header, data } = getExport();
		downloadCSV(header, data, `${filename}-${stamp()}.csv`);
	}

	function exportJson() {
		const { header, data } = getExport();
		downloadJSON(
			data.map((row) => Object.fromEntries(header.map((name, i) => [name, row[i]]))),
			`${filename}-${stamp()}.json`
		);
	}
</script>

<div class="no-print dropdown dropdown-end">
	<button tabindex="0" class="btn btn-square btn-ghost" aria-label={m.exportData()}>
		<i class="fa-duotone fa-file-export text-xl"></i>
	</button>
	<ul class="dropdown-content menu z-10 w-48 rounded-box bg-base-200 p-2 shadow">
		<li>
			<button onclick={exportCsv}><i class="fa-duotone fa-file-csv"></i> CSV</button>
		</li>
		<li>
			<button onclick={exportJson}><i class="fa-duotone fa-file-code"></i> JSON</button>
		</li>
		<li>
			<button onclick={() => window.print()}>
				<i class="fa-duotone fa-print"></i>
				{m.printTable()}
			</button>
		</li>
	</ul>
</div>
