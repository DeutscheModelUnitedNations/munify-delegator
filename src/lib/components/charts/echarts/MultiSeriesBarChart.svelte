<script lang="ts">
	import { multiSeriesBarChartOptions, type MultiSeriesBarSeries } from './chartOptions';
	import EChartsBase from './EChartsBase.svelte';

	interface Props {
		labels: string[];
		series: MultiSeriesBarSeries[];
		title?: string;
		class?: string;
		height?: string;
		loading?: boolean;
		showValues?: boolean;
		yAxisName?: string;
		xAxisName?: string;
		stacked?: boolean;
		showLegend?: boolean;
	}

	let {
		labels,
		series,
		title,
		class: className = '',
		height = '300px',
		loading = false,
		showValues = false,
		yAxisName,
		xAxisName,
		stacked = true,
		showLegend = true
	}: Props = $props();

	const options = $derived(
		multiSeriesBarChartOptions({
			labels,
			series,
			title,
			showValues,
			yAxisName,
			xAxisName,
			stacked,
			showLegend
		})
	);
</script>

<EChartsBase {options} class={className} {height} {loading} notMerge={true} />
