<script lang="ts">
	import { get, type Readable } from 'svelte/store';

	interface Props {
		exportedData: Readable<Record<string, unknown>[]>;
	}

	let { exportedData }: Props = $props();

	let confirmDialogOpen = $state(false);

	const exportPdf = () => {
		confirmDialogOpen = false;
		window.print();
	};

	const exportJson = () => {
		confirmDialogOpen = false;
		const data = JSON.stringify(get(exportedData));
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
		const data = get(exportedData);
		// header
		const csv = [Object.keys(data[0]).join(',')];

		// rows
		csv.push(...data.map((row) => Object.values(row).join(',')));

		const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'export.csv';
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md p-4">
	<div class="card-title">Export</div>
	<div class="card-body flex-row">
		<button class="btn btn-primary" onclick={() => (confirmDialogOpen = true)}>
			<i class="fas fa-file-export"></i>
			Exportieren
		</button>
	</div>
</div>

<dialog class="modal {confirmDialogOpen && 'modal-open'}">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Bist du sicher?</h3>
		<p class="py-4">
			Die Daten enthalten möglicherweise sensible Informationen. Bist du sicher, dass du die Daten
			exportieren möchtest?
		</p>
		<div class="modal-action justify-between">
			<button class="btn btn-error" onclick={() => (confirmDialogOpen = false)}>
				<i class="fas fa-xmark"></i>
			</button>
			<div class="flex gap-2">
				<button class="btn btn-primary" onclick={exportPdf}>
					<div class="flex items-center gap-3">
						<i class="fas fa-print text-xl"></i>
						<i class="fas fa-file-pdf text-xl"></i>
					</div>
				</button>
				<button class="btn btn-primary w-16" onclick={exportCsv}>
					<i class="fas fa-file-csv text-xl"></i>
				</button>
				<button class="btn btn-primary w-16" onclick={exportJson}>
					<i class="fas fa-file-code text-xl"></i>
				</button>
			</div>
		</div>
	</div>
</dialog>
