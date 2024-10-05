<script lang="ts">
	import { stringify } from 'csv-stringify/browser/esm/sync';
	interface Props {
		exportedData: Record<string, string>[];
	}

	let { exportedData }: Props = $props();

	let confirmDialogOpen = $state(false);

	const exportPdf = () => {
		confirmDialogOpen = false;
		window.print();
	};

	const exportJson = () => {
		confirmDialogOpen = false;
		const data = JSON.stringify(exportedData, null, 2);
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'export.json';
		a.click();
		URL.revokeObjectURL(url);
	};

	const exportCsv = () => {
		confirmDialogOpen = false;
		const data = exportedData;
		// header
		const csv = data.map((row) => Object.values(row));

		console.log(csv);

		const blob = new Blob([stringify(csv, { header: true, columns: Object.keys(data[0]) })], {
			type: 'text/csv'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'export.csv';
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<button
	class="btn btn-square btn-ghost"
	onclick={() => (confirmDialogOpen = true)}
	aria-label="Export"
>
	<i class="fa-duotone fa-file-export text-xl"></i>
</button>

<dialog class="modal {confirmDialogOpen && 'modal-open'}">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Bist du sicher?</h3>
		<p class="py-4">
			Die Daten enthalten möglicherweise sensible Informationen. Bist du sicher, dass du die Daten
			exportieren möchtest?
		</p>
		<div class="modal-action justify-between">
			<button class="btn btn-error" onclick={() => (confirmDialogOpen = false)} aria-label="Exit">
				<i class="fas fa-xmark"></i>
			</button>
			<div class="flex gap-2">
				<button class="btn btn-primary" onclick={exportPdf} aria-label="Print">
					<div class="flex items-center gap-3">
						<i class="fas fa-print text-xl"></i>
						<i class="fas fa-file-pdf text-xl"></i>
					</div>
				</button>
				<button class="btn btn-primary w-16" onclick={exportCsv} aria-label="Export CSV">
					<i class="fas fa-file-csv text-xl"></i>
				</button>
				<button class="btn btn-primary w-16" onclick={exportJson} aria-label="Export JSON">
					<i class="fas fa-file-code text-xl"></i>
				</button>
			</div>
		</div>
	</div>
</dialog>
