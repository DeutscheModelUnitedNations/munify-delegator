<script lang="ts">
	import { barChartOptions } from './chartOptions';
	import EChartsBase from './EChartsBase.svelte';

	interface Props {
		labels: string[];
		values: number[];
		title?: string;
		horizontal?: boolean;
		class?: string;
		height?: string;
		loading?: boolean;
		showValues?: boolean;
		yAxisName?: string;
		xAxisName?: string;
		color?: string;
	}

	let {
		labels,
		values,
		title,
		horizontal = false,
		class: className = '',
		height = '300px',
		loading = false,
		showValues = true,
		yAxisName,
		xAxisName,
		color
	}: Props = $props();

	const options = $derived(
		barChartOptions({
			labels,
			values,
			title,
			horizontal,
			showValues,
			yAxisName,
			xAxisName,
			color
		})
	);
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
