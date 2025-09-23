<script lang="ts">
	interface Props {
		title: string;
		data: number[][];
		xLabels: (string | { label: string; icon: string })[];
		yLabels: (string | { label: string; icon: string })[];
	}

	let { data, xLabels, yLabels, title }: Props = $props();
</script>

<div
	class="bg-base-200 col-span-2 overflow-x-auto rounded-2xl p-6 shadow-sm sm:col-span-2 md:col-span-12 xl:col-span-6"
>
	<h1 class="stat-title w-full">{title}</h1>
	<div class="overflow-x-auto">
		<table class="table w-full">
			<!-- head -->
			<thead>
				<tr>
					<th></th>
					{#each xLabels as label}
						<th>{label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data as rowData, i}
					<tr>
						<th>
							{#if typeof yLabels[i] === 'string'}
								{yLabels[i]}
							{:else}
								<i class="fa-duotone {yLabels[i].icon}"></i>
								{yLabels[i].label}
							{/if}
						</th>
						{#each rowData as entry}
							<td>{entry}</td>
						{/each}
						<!-- row sums -->
						<td><b>{rowData.reduce((a, b) => a + b, 0)}</b></td>
					</tr>
				{/each}
				<tr>
					<th></th>
					<!-- col sums -->
					{#each data[0] as _, i}
						<td><b>{data.reduce((a, b) => a + b[i], 0)}</b></td>
					{/each}
					<!-- total -->
					<td><b>{data.reduce((a, b) => a + b.reduce((a, b) => a + b, 0), 0)}</b></td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
