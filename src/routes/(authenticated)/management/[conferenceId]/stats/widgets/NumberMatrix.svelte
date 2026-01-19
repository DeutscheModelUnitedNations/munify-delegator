<script lang="ts">
	interface Props {
		title: string;
		data: number[][];
		xLabels: (string | { label: string; icon: string })[];
		yLabels: (string | { label: string; icon: string })[];
	}

	let { data, xLabels, yLabels, title }: Props = $props();
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-6">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-table text-base-content/70"></i>
			{title}
		</h2>
		<div class="overflow-x-auto">
			<table class="table table-sm bg-base-100 rounded-lg">
				<thead>
					<tr>
						<th></th>
						{#each xLabels as label}
							<th class="text-center text-xs">{typeof label === 'string' ? label : label.label}</th>
						{/each}
						<th class="text-center text-xs font-bold">Σ</th>
					</tr>
				</thead>
				<tbody>
					{#each data as rowData, i}
						<tr>
							<th class="text-xs">
								{#if typeof yLabels[i] === 'string'}
									{yLabels[i]}
								{:else}
									<i class="fa-duotone {yLabels[i].icon} mr-1"></i>
									{yLabels[i].label}
								{/if}
							</th>
							{#each rowData as entry}
								<td class="text-center">{entry}</td>
							{/each}
							<td class="text-center font-bold">{rowData.reduce((a, b) => a + b, 0)}</td>
						</tr>
					{/each}
					<tr class="border-t border-base-300">
						<th class="text-xs font-bold">Σ</th>
						{#each data[0] as _, i}
							<td class="text-center font-bold">{data.reduce((a, b) => a + b[i], 0)}</td>
						{/each}
						<td class="text-center font-bold"
							>{data.reduce((a, b) => a + b.reduce((c, d) => c + d, 0), 0)}</td
						>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</section>
